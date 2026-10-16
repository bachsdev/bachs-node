"""AsyncBachs: the same contract as Bachs, plus an exact deadline and task cancellation. Runs on asyncio and trio."""

from __future__ import annotations

import inspect
import socket
import threading
import time
from collections.abc import Callable, Iterator
from typing import Any

import anyio
import httpx
import pytest
from conftest import KEY, FakeClock, Mock, json_response, respond

import bachs._transport as transport_module
from bachs import (
    AsyncBachs,
    Bachs,
    BachsApiError,
    BachsConfigError,
    BachsNetworkError,
    BachsResponseError,
    BachsTimeoutError,
    webhooks,
)

pytestmark = pytest.mark.anyio

product = {"id": "prod_example", "name": "Pro Plan", "price": {"currency": "USD", "price_type": "fixed",
                                                               "amount": "12.00"}}
created = {"checkout_id": "chk_x", "checkout_url": "https://checkout.example.com/x", "status": "open",
           "expires_at": "2026-10-03T13:00:00Z", "created_at": "2026-10-03T12:00:00Z", "reference": None}
payment = {"payment_id": "pay_x", "status": "succeeded", "amount": "12.00", "currency": "USD",
           "created_at": "2026-10-03T12:00:00Z", "updated_at": "2026-10-03T12:01:00Z"}
pagination = {"has_more": False, "limit": 1, "offset": 0, "returned": 1, "total": 1}
subscription = {"id": "sub_x", "status": "active"}
destination = {"id": "pd_x", "name": "Destination", "type": "bank_account", "currency": "NGN", "status": "approved"}
quote = {"quote_id": "pqt_x", "from_currency": "USD", "to_currency": "NGN", "from_amount": "1.00",
         "to_amount": "1400.00", "exchange_rate": "1400.00", "expires_at": "2026-10-03T12:01:00Z"}
payout = {"id": "po_x", "status": "pending", "amount": "1.00", "currency": "USD"}

# Every public method, with the response it needs. The parity test sends each through both clients.
OPERATIONS: list[tuple[str, Callable[[Any], Any], Any]] = [
    ("products.create", lambda c: c.products.create({"name": "P", "price": {"currency": "USD", "amount": "1.00"}},
                                                    idempotency_key="k1"), product),
    ("products.get", lambda c: c.products.get("prod/a"), product),
    ("products.list", lambda c: c.products.list({"limit": 1, "include_archived": True, "ignored": 1}),
     {"items": [product], "pagination": {}}),
    ("checkout_sessions.create", lambda c: c.checkout_sessions.create({"pricing": {"currency": "USD"}}), created),
    ("checkout_sessions.get", lambda c: c.checkout_sessions.get("chk_x"), {"checkout_id": "chk_x", "status": "open"}),
    ("payments.get", lambda c: c.payments.get("pay_x"), payment),
    ("payments.list", lambda c: c.payments.list({"status_filter": "succeeded"}),
     {"items": [], "pagination": pagination}),
    ("subscriptions.get", lambda c: c.subscriptions.get("sub_x"), subscription),
    ("subscriptions.list", lambda c: c.subscriptions.list({"customer_id": "cust_x"}),
     {"items": [subscription], "pagination": {}}),
    ("subscriptions.cancel", lambda c: c.subscriptions.cancel("sub_x"), subscription),
    ("customer_portal.create_session", lambda c: c.customer_portal.create_session("cust/x"),
     {"id": "psn_x", "url": "https://portal.example.com/s"}),
    ("balances.get", lambda c: c.balances.get(), {"account_id": "a", "total_balance_usd": "0", "balances": []}),
    ("banks.list", lambda c: c.banks.list({"country": "NG"}), {"country": "NG", "banks": []}),
    ("banks.resolve_account", lambda c: c.banks.resolve_account({"account_number": "0", "bank_code": "001"}),
     {"resolved": False, "account_name": None, "account_number": None, "message": "no"}),
    ("payout_destinations.create", lambda c: c.payout_destinations.create({"currency": "NGN"}), destination),
    ("payout_destinations.get", lambda c: c.payout_destinations.get("pd_x"), destination),
    ("payout_destinations.list", lambda c: c.payout_destinations.list({"status": "approved"}),
     {"destinations": [], "total": 0, "limit": 20, "offset": 0}),
    ("payout_quotes.create", lambda c: c.payout_quotes.create({"from_currency": "USD", "to_currency": "NGN",
                                                               "amount": "1.00"}), quote),
    ("payouts.create", lambda c: c.payouts.create({"destination": "pd_x", "quote_id": "pqt_x"},
                                                  idempotency_key="k2"), payout),
    ("payouts.get", lambda c: c.payouts.get("po_x"), payout),
    ("payouts.list", lambda c: c.payouts.list({"offset": 0}), {"items": [payout], "total": 1}),
]
WRITES = {name for name, _, _ in OPERATIONS if name.split(".")[1] in {"create", "cancel", "create_session",
                                                                       "resolve_account"}}


@pytest.fixture
def async_clock(monkeypatch: pytest.MonkeyPatch) -> FakeClock:
    """Fake time for retry decisions; waits still yield to the event loop so cancellation can land."""
    fake = FakeClock()

    async def sleep(seconds: float) -> None:
        fake.sleep(seconds)
        await anyio.sleep(0)

    monkeypatch.setattr(transport_module, "_monotonic", fake.monotonic)
    monkeypatch.setattr(transport_module, "_async_sleep", sleep)
    monkeypatch.setattr(transport_module, "_random", lambda: 0.5)
    return fake


def test_every_method_has_an_async_twin_with_the_same_signature() -> None:
    sync_client = Bachs(api_key=KEY, environment="sandbox")
    async_client = AsyncBachs(api_key=KEY, environment="sandbox")
    names = {name for name, _, _ in OPERATIONS}
    for resource in ("products", "checkout_sessions", "payments", "subscriptions", "customer_portal", "balances",
                     "banks", "payout_destinations", "payout_quotes", "payouts"):
        sync_resource, async_resource = getattr(sync_client, resource), getattr(async_client, resource)
        public = [m for m in dir(sync_resource) if not m.startswith("_")]
        assert public == [m for m in dir(async_resource) if not m.startswith("_")]
        for method in public:
            assert f"{resource}.{method}" in names, f"{resource}.{method} is missing from OPERATIONS"
            assert inspect.iscoroutinefunction(getattr(async_resource, method))
            assert inspect.signature(getattr(sync_resource, method)) == inspect.signature(
                getattr(async_resource, method))
    assert async_client.webhooks is webhooks and KEY not in repr(async_client)


@pytest.mark.parametrize(("name", "operation", "response"), OPERATIONS, ids=[o[0] for o in OPERATIONS])
async def test_async_and_sync_clients_send_identical_requests_and_return_the_same_result(
    name: str, operation: Callable[[Any], Any], response: Any
) -> None:
    sync_mock, async_mock = Mock(responses=[response]), Mock(responses=[response])
    sync_result = operation(sync_mock.client())
    async_result = await operation(async_mock.async_client())
    assert sync_result == async_result == response
    (sent_sync,), (sent_async,) = sync_mock.calls, async_mock.calls
    assert (sent_sync.method, str(sent_sync.url), sent_sync.body) == (
        sent_async.method, str(sent_async.url), sent_async.body)
    assert dict(sent_sync.headers) == dict(sent_async.headers)
    assert (sent_async.method != "GET") == (name in WRITES)


async def test_reads_retry_with_backoff_and_hints(mock: Mock, async_clock: FakeClock) -> None:
    mock.responses = [json_response({"detail": "busy"}, 429, {"retry-after": "1"}),
                      json_response({"detail": "busy"}, 503), product]
    assert (await mock.async_client().products.get("prod_example"))["id"] == "prod_example"
    assert len(mock.calls) == 3 and async_clock.sleeps == [1.0, 1.0]

    mock.calls.clear()
    async_clock.sleeps.clear()
    mock.responses = [httpx.ReadError("connection lost"), json_response({"detail": "busy"}, 500),
                      json_response({"detail": "still busy"}, 502)]
    with pytest.raises(BachsApiError) as caught:
        await mock.async_client().products.get("prod_example")
    assert caught.value.status == 502 and caught.value.outcome_unknown is False
    assert len(mock.calls) == 3 and async_clock.sleeps == [0.5, 1.0]

    mock.calls.clear()
    mock.responses = [json_response({"detail": "wait longer"}, 429, {"retry-after": "10"})]
    with pytest.raises(BachsApiError):
        await mock.async_client(timeout=1).products.get("prod_example")
    assert len(mock.calls) == 1


async def test_every_write_is_sent_once_and_reports_uncertain_outcomes(mock: Mock, async_clock: FakeClock) -> None:
    sdk = mock.async_client(max_retries=5)
    for name, operation, _ in OPERATIONS:
        if name not in WRITES:
            continue
        for status in (429, 503):
            mock.calls.clear()
            mock.responses = [json_response({"detail": "failure"}, status)]
            with pytest.raises(BachsApiError) as caught:
                await operation(sdk)
            assert caught.value.outcome_unknown is (status >= 500) and len(mock.calls) == 1, name
        mock.calls.clear()
        mock.responses = [httpx.ReadError("response lost")]
        with pytest.raises(BachsNetworkError) as lost:
            await operation(sdk)
        assert lost.value.outcome_unknown is True and len(mock.calls) == 1, name
        mock.calls.clear()
        mock.responses = [{"unknown_shape": True}]
        with pytest.raises(BachsResponseError) as unusable:
            await operation(sdk)
        assert unusable.value.outcome_unknown is True, name
    assert async_clock.sleeps == []


async def test_misuse_fails_before_anything_is_sent(mock: Mock) -> None:
    sdk = mock.async_client()
    with pytest.raises(BachsConfigError):
        await sdk.payouts.create({"destination": "pd_x", "amount": "1.00", "quote_id": "pqt_x"})  # type: ignore[arg-type]
    with pytest.raises(BachsConfigError):
        await sdk.checkout_sessions.create({})  # type: ignore[arg-type]
    with pytest.raises(BachsConfigError):
        await sdk.payments.get("")
    with pytest.raises(BachsConfigError):
        await sdk.products.create({"name": "P", "price": {"currency": "USD", "amount": "1"}}, idempotency_key=" k")
    with pytest.raises(BachsConfigError):
        AsyncBachs(api_key=KEY, environment="staging")  # type: ignore[arg-type]
    assert mock.calls == []


async def test_redirects_are_not_followed(server: Any) -> None:
    base_url, records = server(lambda _record: (302, {"location": "/other"}, b"redirect"))
    async with AsyncBachs(api_key=KEY, environment="sandbox", base_url=base_url) as sdk:
        with pytest.raises(BachsApiError) as caught:
            await sdk.products.get("prod_example")
    assert caught.value.status == 302 and len(records) == 1


async def test_real_server_round_trip_preserves_body_and_key(server: Any) -> None:
    base_url, records = server(lambda _record: respond(product, 201))
    async with AsyncBachs(api_key=KEY, environment="sandbox", base_url=base_url) as sdk:
        payload: Any = {"name": "Free", "price": {"currency": "USD", "price_type": "free", "amount": None}}
        await sdk.products.create(payload, idempotency_key="catalog-free")
    assert records[0].body == '{"name":"Free","price":{"currency":"USD","price_type":"free","amount":null}}'
    assert records[0].headers["idempotency-key"] == "catalog-free"


@pytest.fixture
def stalling_server() -> Iterator[Callable[[float, bytes], str]]:
    """Accepts a request, waits, sends ``prefix``, then stalls for 10 s without closing."""
    sockets: list[socket.socket] = []

    def start(wait: float, prefix: bytes) -> str:
        listener = socket.socket()
        listener.bind(("127.0.0.1", 0))
        listener.listen()
        sockets.append(listener)

        def serve() -> None:
            while True:
                try:
                    conn, _ = listener.accept()
                except OSError:
                    return
                sockets.append(conn)
                conn.recv(65536)
                time.sleep(wait)
                conn.sendall(prefix)

        threading.Thread(target=serve, daemon=True).start()
        return f"http://127.0.0.1:{listener.getsockname()[1]}"

    yield start
    for sock in sockets:
        sock.close()


HEADERS_AND_HALF_A_BODY = b"HTTP/1.1 200 OK\r\ncontent-type: application/json\r\ncontent-length: 100\r\n\r\n{\"id\":"


async def test_deadline_is_exact_when_the_body_stalls(stalling_server: Callable[[float, bytes], str]) -> None:
    # Headers and half a body arrive at 0.2 s, then nothing. The sync client would wait up to 0.5 s more here.
    base_url = stalling_server(0.2, HEADERS_AND_HALF_A_BODY)
    sdk = AsyncBachs(api_key=KEY, environment="sandbox", base_url=base_url, timeout=0.5)
    started = time.monotonic()
    with pytest.raises(BachsTimeoutError) as caught:
        await sdk.products.get("prod_example")
    elapsed = time.monotonic() - started
    assert 0.5 <= elapsed < 0.65, elapsed
    assert caught.value.response_status == 200 and caught.value.outcome_unknown is False
    await sdk.aclose()


async def test_deadline_is_exact_for_a_write_and_its_outcome_is_unknown(
    stalling_server: Callable[[float, bytes], str]
) -> None:
    base_url = stalling_server(10, b"")
    sdk = AsyncBachs(api_key=KEY, environment="sandbox", base_url=base_url, timeout=0.3)
    started = time.monotonic()
    with pytest.raises(BachsTimeoutError) as caught:
        await sdk.payouts.create({"destination": "pd_x", "amount": "1.00"}, idempotency_key="k")
    assert time.monotonic() - started < 0.45
    assert caught.value.outcome_unknown is True and caught.value.response_status is None
    await sdk.aclose()


async def test_caller_cancellation_stops_retries_and_propagates(mock: Mock, async_clock: FakeClock) -> None:
    # Port of scenario 28: cancellation in Python is the task's own cancel scope, not a BachsError.
    sdk = mock.async_client()
    mock.handler = lambda _request: json_response({"detail": "temporarily unavailable"}, 503)
    with anyio.CancelScope() as scope:
        scope.cancel()
        await sdk.products.get("prod_example")
    assert scope.cancelled_caught and mock.calls == []

    def cancel_after_first_attempt(_request: httpx.Request) -> httpx.Response:
        outer.cancel()
        return json_response({"detail": "temporarily unavailable"}, 503)

    mock.handler = cancel_after_first_attempt
    with anyio.CancelScope() as outer:
        await sdk.products.get("prod_example")
    assert outer.cancelled_caught and len(mock.calls) == 1, "No retry may start after cancellation."
