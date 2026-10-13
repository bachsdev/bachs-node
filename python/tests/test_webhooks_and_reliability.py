"""Port of test/batch-5.test.mjs: webhook verification and reliability across every V1 resource."""

from __future__ import annotations

import hashlib
import hmac
import json
import time
from collections.abc import Callable
from typing import Any

import httpx
import pytest
from conftest import FakeClock, Mock, json_response

import bachs
from bachs import (
    Bachs,
    BachsApiError,
    BachsConfigError,
    BachsNetworkError,
    BachsResponseError,
    BachsTimeoutError,
    BachsWebhookError,
    webhooks,
)

secret = "synthetic-signing-secret"
seconds = 1801569600
event = {"id": "evt_synthetic", "type": "payout.paid", "created_at": "2026-10-03T12:00:00Z",
         "organization_id": "acct_synthetic", "data": {"payout_id": "pay_synthetic"}, "future_field": True}
# Same bytes JSON.stringify produces in the Node tests.
raw = json.dumps(event, separators=(",", ":"))


def signature(body: str | bytes, timestamp: str = str(seconds), key: str = secret) -> str:
    data = body.encode() if isinstance(body, str) else body
    return hmac.new(key.encode(), timestamp.encode() + b"." + data, hashlib.sha256).hexdigest()


def legacy(body: str | bytes, timestamp: str = str(seconds)) -> dict[str, Any]:
    return {"X-Bachs-Timestamp": timestamp, "X-Bachs-Signature": signature(body, timestamp)}


@pytest.fixture(autouse=True)
def frozen_wall_clock(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(time, "time", lambda: float(seconds))


def test_41_legacy_signatures_verify_exact_utf8_bytes_and_preserve_the_envelope() -> None:
    assert webhooks.construct_event(raw, legacy(raw), secret) == event
    unicode = json.dumps({**event, "data": {"name": "Synthetic café"}}, ensure_ascii=False, separators=(",", ":"))
    encoded = unicode.encode("utf-8")
    assert webhooks.construct_event(encoded, httpx.Headers(legacy(unicode)), secret)["data"]["name"] == "Synthetic café"
    assert webhooks.construct_event(bytearray(encoded), legacy(encoded), secret)["id"] == event["id"]


def test_42_v2_accepts_a_matching_rotation_signature_beyond_the_first_and_unknown_types() -> None:
    future = json.dumps({**event, "type": "future.event"}, separators=(",", ":"))
    header = f"t={seconds},v1={signature(future, key='previous-synthetic-secret')},v1={signature(future)}"
    assert webhooks.construct_event(future, {"x-bachs-signature-v2": header}, secret)["type"] == "future.event"
    verified = webhooks.construct_event(future, {"X-Bachs-Signature-V2": header}, "previous-synthetic-secret")
    assert verified["future_field"] is True  # type: ignore[typeddict-item]


def test_43_wrong_secret_changed_body_and_reserialized_json_fail() -> None:
    with pytest.raises(BachsWebhookError):
        webhooks.construct_event(raw, legacy(raw), "different-secret")
    with pytest.raises(BachsWebhookError):
        webhooks.construct_event(raw.replace("payout.paid", "payout.failed"), legacy(raw), secret)
    spaced = json.dumps(event, indent=2)
    with pytest.raises(BachsWebhookError):
        webhooks.construct_event(raw, legacy(spaced), secret)
    assert webhooks.construct_event(spaced, legacy(spaced), secret) == event


def test_44_stale_and_future_timestamps_are_rejected_at_an_explicit_boundary() -> None:
    for timestamp in (str(seconds - 301), str(seconds + 301)):
        with pytest.raises(BachsWebhookError):
            webhooks.construct_event(raw, legacy(raw, timestamp), secret)
    assert webhooks.construct_event(raw, legacy(raw, str(seconds - 300)), secret)["id"] == event["id"]
    with pytest.raises(BachsWebhookError):
        webhooks.construct_event(raw, legacy(raw, str(seconds - 10)), secret, tolerance=5)
    for timestamp in ("123abc", "-1", "NaN", "9007199254740992", "١٢٣", "1" * 5000, f"{seconds}\n"):
        with pytest.raises(BachsWebhookError):
            webhooks.construct_event(raw, legacy(raw, timestamp), secret)


@pytest.mark.parametrize("headers", [
    {},
    {"X-Bachs-Timestamp": str(seconds), "X-Bachs-Signature": "a"},
    {**legacy(raw), "X-Bachs-Signature-V2": "malformed"},
    {"X-Bachs-Signature-V2": f"t={seconds},t={seconds},v1={signature(raw)}"},
    {"X-Bachs-Timestamp": [str(seconds), str(seconds)], "X-Bachs-Signature": signature(raw)},
    {**legacy(raw), "x-bachs-timestamp": str(seconds)},
    {"X-Bachs-Timestamp": str(seconds), "X-Bachs-Signature": signature(raw)[:-1] + "z"},
])
def test_45_malformed_or_duplicate_signature_headers_fail_without_fallback(headers: dict[str, Any]) -> None:
    with pytest.raises(BachsWebhookError):
        webhooks.construct_event(raw, headers, secret)


def test_46_only_signed_valid_json_envelopes_are_returned_and_misuse_is_rejected() -> None:
    for value in ("not-json", "null", "[]", "{}", '{"id": NaN}', json.dumps({**event, "data": None}),
                  json.dumps({**event, "id": ""})):
        with pytest.raises(BachsWebhookError):
            webhooks.construct_event(value, legacy(value), secret)
    invalid_utf8 = bytes([0xFF])
    with pytest.raises(BachsWebhookError):
        webhooks.construct_event(invalid_utf8, legacy(invalid_utf8), secret)
    with pytest.raises(BachsConfigError):
        webhooks.construct_event(raw, None, secret)  # type: ignore[arg-type]
    for header in (1, [1], b"bytes"):
        with pytest.raises(BachsWebhookError):
            webhooks.construct_event(raw, {"X-Bachs-Signature-V2": header}, secret)  # type: ignore[dict-item]
    with pytest.raises(BachsConfigError):
        webhooks.construct_event(event, legacy(raw), secret)  # type: ignore[arg-type]
    with pytest.raises(BachsConfigError):
        webhooks.construct_event(raw, legacy(raw), "")
    for tolerance in (-1, float("nan"), float("inf"), True):
        with pytest.raises(BachsConfigError):
            webhooks.construct_event(raw, legacy(raw), secret, tolerance=tolerance)


def write_operations(sdk: Bachs) -> list[Callable[[], Any]]:
    return [
        lambda: sdk.checkout_sessions.create({"pricing": {"currency": "USD", "amount": "12.00"}}),
        lambda: sdk.subscriptions.cancel("sub_synthetic"),
        lambda: sdk.customer_portal.create_session("cust_synthetic"),
        lambda: sdk.banks.resolve_account({"account_number": "0000000000", "bank_code": "001"}),
        lambda: sdk.payout_destinations.create({"currency": "NGN"}),
        lambda: sdk.payout_quotes.create({"from_currency": "USD", "to_currency": "NGN", "amount": "1.00"}),
        lambda: sdk.payouts.create({"destination": "pd_synthetic", "amount": "1.00"},
                                   idempotency_key="synthetic-operation"),
    ]


def test_47_all_v1_writes_send_once_on_temporary_http_errors_and_lost_responses(mock: Mock, clock: FakeClock) -> None:
    for operation in write_operations(mock.client(max_retries=5)):
        for status in (429, 503):
            mock.calls.clear()
            mock.responses = [json_response({"detail": "Synthetic failure", "error_code": "FUTURE_ERROR"}, status)]
            with pytest.raises(BachsApiError) as caught:
                operation()
            assert caught.value.status == status and caught.value.outcome_unknown is (status >= 500)
            assert len(mock.calls) == 1
        mock.calls.clear()
        mock.responses = [httpx.ReadError("Synthetic response lost")]
        with pytest.raises(BachsNetworkError) as lost:
            operation()
        assert lost.value.outcome_unknown is True and len(mock.calls) == 1
    assert clock.sleeps == []


def test_48_shared_retry_and_deadline_policy_reaches_every_resource(mock: Mock, clock: FakeClock) -> None:
    mock.responses = [json_response({"detail": "Busy"}, 503),
                      {"id": "pay_synthetic", "status": "pending", "amount": "1.00", "currency": "USD"}]
    assert mock.client().payouts.get("pay_synthetic")["status"] == "pending"
    assert len(mock.calls) == 2 and clock.sleeps == [0.5]

    def never_answers(request: httpx.Request) -> httpx.Response:
        clock.advance(0.02)
        raise httpx.ReadTimeout("Simulated", request=request)

    mock.calls.clear()
    mock.handler = never_answers
    with pytest.raises(BachsTimeoutError) as caught:
        mock.client(timeout=0.02).payouts.create({"destination": "pd_synthetic", "amount": "1.00"})
    assert caught.value.outcome_unknown is True and len(mock.calls) == 1

    mock.calls.clear()
    with pytest.raises(BachsTimeoutError):
        mock.client().subscriptions.cancel("sub_synthetic", {}, timeout=0.02)
    assert len(mock.calls) == 1


def test_49_ambiguous_request_modes_fail_before_send_and_unsupported_success_is_not_retried(mock: Mock) -> None:
    mock.handler = lambda _request: json_response({"unknown_shape": True})
    sdk = mock.client()
    for payout_input in ({"destination": "pd_synthetic"},
                         {"destination": "pd_synthetic", "amount": "1.00", "quote_id": "pqt_synthetic"},
                         {"destination": "pd_synthetic", "amount": 1}, {"destination": "pd_synthetic", "quote_id": ""},
                         None):
        with pytest.raises(BachsConfigError):
            sdk.payouts.create(payout_input)  # type: ignore[arg-type]
    for checkout_input in ({}, {"product_cart": [], "pricing": {"currency": "USD"}}, {"pricing": None},
                           {"product_cart": "prod_synthetic"}):
        with pytest.raises(BachsConfigError):
            sdk.checkout_sessions.create(checkout_input)  # type: ignore[arg-type]
    for resource in (sdk.checkout_sessions, sdk.payments, sdk.subscriptions, sdk.payout_destinations, sdk.payouts):
        with pytest.raises(BachsConfigError):
            resource.get("")
    with pytest.raises(BachsConfigError):
        sdk.payout_destinations.create({"currency": "NGN", "metadata": {"bad": float("nan")}})
    with pytest.raises(BachsConfigError):
        sdk.payout_destinations.create({"currency": "NGN", "metadata": {"bad": object()}})  # type: ignore[dict-item]
    assert len(mock.calls) == 0
    with pytest.raises(BachsResponseError):
        sdk.payouts.get("pay_synthetic")
    assert len(mock.calls) == 1
    with pytest.raises(BachsResponseError) as caught:
        sdk.payouts.create({"destination": "pd_synthetic", "amount": "1.00"})
    assert caught.value.outcome_unknown is True and len(mock.calls) == 2


def test_50_package_exposes_the_errors_helpers_and_only_agreed_v1_resources() -> None:
    assert all(hasattr(bachs, name) for name in bachs.__all__)
    assert issubclass(BachsWebhookError, bachs.BachsError) and issubclass(BachsTimeoutError, BachsNetworkError)
    sdk = Bachs(api_key="synthetic-key", environment="sandbox")
    assert sdk.webhooks is webhooks
    for resource in ("products", "checkout_sessions", "payments", "subscriptions", "customer_portal", "balances",
                     "banks", "payout_destinations", "payout_quotes", "payouts"):
        assert getattr(sdk, resource)
    assert not hasattr(sdk, "connect") and not hasattr(sdk.payments, "create")
    assert not hasattr(sdk.subscriptions, "create")
    assert "synthetic-key" not in repr(sdk)
    with Bachs(api_key="synthetic-key", environment="sandbox") as scoped:
        assert scoped.products
