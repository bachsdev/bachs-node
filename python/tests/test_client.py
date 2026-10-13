"""Port of test/batch-3.test.mjs: client configuration, products and transport reliability."""

from __future__ import annotations

import copy
import json
from collections.abc import Iterator
from typing import Any
from urllib.parse import parse_qs, urlsplit

import httpx
import pytest
from conftest import KEY, FakeClock, Mock, json_response, respond

from bachs import (
    Bachs,
    BachsApiError,
    BachsConfigError,
    BachsNetworkError,
    BachsResponseError,
    BachsTimeoutError,
)


def product(**extra: Any) -> dict[str, Any]:
    value = {
        "id": "prod_example", "name": "Pro Plan",
        "price": {"currency": "USD", "price_type": "fixed", "amount": "12.00", "currency_options": []},
        "metadata": None, "media": [], "future_field": {"preserved": True},
    }
    value.update(extra)
    return value


@pytest.mark.parametrize("options", [
    {"api_key": None}, {"api_key": ""}, {"api_key": "key\r\nInjected: value"}, {"api_key": " key"},
    {"environment": None}, {"environment": "staging"},
    {"timeout": 0}, {"timeout": 2147483.648}, {"timeout": True}, {"max_retries": -1}, {"max_retries": 1.5},
    {"base_url": "http://example.com"}, {"base_url": "https://user:password@example.com"},
    {"base_url": "https://example.com/?q=1"}, {"base_url": "https://example.com/#f"}, {"base_url": "example.com"},
])
def test_21_rejects_invalid_configuration(options: dict[str, Any]) -> None:
    settings: dict[str, Any] = {"api_key": KEY, "environment": "sandbox", **options}
    with pytest.raises(BachsConfigError):
        Bachs(**settings)


def test_21_explicit_environment_credentials_and_redirect_safety(mock: Mock, server: Any) -> None:
    with pytest.raises(TypeError):
        Bachs(api_key=KEY)  # type: ignore[call-arg]
    mock.responses = [product(), product()]
    sandbox = mock.client()
    sandbox.products.get("prod_example")
    mock.client(environment="production").products.get("prod_example")
    assert str(mock.calls[0].url) == "https://sandbox-api.bachs.io/v1/products/prod_example"
    assert str(mock.calls[1].url) == "https://api.bachs.io/v1/products/prod_example"
    assert mock.calls[0].headers["authorization"] == "Bearer " + KEY
    assert "idempotency-key" not in mock.calls[0].headers
    assert KEY not in repr(sandbox) and KEY not in repr(vars(sandbox))
    for loopback in ("http://localhost:1", "http://[::1]:1"):
        Bachs(api_key=KEY, environment="sandbox", base_url=loopback)

    base_url, records = server(lambda _record: (302, {"location": "/other"}, b"redirect"))
    with pytest.raises(BachsApiError) as caught:
        Bachs(api_key=KEY, environment="sandbox", base_url=base_url).products.get("prod_example")
    assert caught.value.status == 302
    assert len(records) == 1, "Must not follow a redirect with the credential."


def test_22_creation_preserves_amounts_omission_null_keys_and_input(server: Any) -> None:
    def handler(record: Any) -> Any:
        sent = json.loads(record.body)
        price = {**sent["price"], "price_type": sent["price"].get("price_type", "fixed"),
                 "amount": sent["price"].get("amount") or "0.00"}
        return respond(product(name=sent["name"], price=price), 201)

    base_url, records = server(handler)
    sdk = Bachs(api_key=KEY, environment="sandbox", base_url=base_url)
    fixed: Any = {"name": "Pro Plan", "price": {"currency": "USD", "amount": "12.00",
                                                "currency_options": [{"currency": "NGN", "amount": "12000.00"}]}}
    original = copy.deepcopy(fixed)
    result = sdk.products.create(fixed, idempotency_key="catalog-pro-plan")
    free: Any = {"name": "Free Plan", "price": {"currency": "USD", "price_type": "free", "amount": None}}
    custom: Any = {"name": "Donation", "price": {"currency": "USD", "price_type": "custom", "preset_amount": "12.00",
                                                 "minimum_amount": None}}
    sdk.products.create(free)
    sdk.products.create(custom)
    assert len(records) == 3 and all(r.method == "POST" and r.path == "/v1/products" for r in records)
    assert fixed == original, "The caller's input must not be modified."
    assert [json.loads(r.body) for r in records] == [fixed, free, custom]
    assert "price_type" not in json.loads(records[0].body)["price"]
    assert records[0].headers["idempotency-key"] == "catalog-pro-plan"
    assert "idempotency-key" not in records[1].headers
    assert result["price"]["amount"] == "12.00"
    assert result["future_field"] == {"preserved": True}  # type: ignore[typeddict-item]


def test_23_retrieval_keeps_an_identifier_inside_one_path_segment(server: Any) -> None:
    base_url, records = server(lambda _record: respond(product()))
    sdk = Bachs(api_key=KEY, environment="sandbox", base_url=base_url)
    sdk.products.get("prod/a ?#")
    assert records[0].path == "/v1/products/prod%2Fa%20%3F%23" and records[0].method == "GET"
    assert records[0].body == "" and "content-type" not in records[0].headers
    for invalid in ("", "   ", None):
        with pytest.raises(BachsConfigError):
            sdk.products.get(invalid)  # type: ignore[arg-type]
    assert len(records) == 1


def test_24_listing_preserves_filters_envelope_and_explicit_pagination(server: Any) -> None:
    page = {"items": [product()], "pagination": {"next_cursor": "next+ /?", "prev_cursor": None, "has_more": True,
                                                 "limit": 2}, "future_envelope": True}
    base_url, records = server(lambda _record: respond(page))
    sdk = Bachs(api_key=KEY, environment="sandbox", base_url=base_url)
    result = sdk.products.list({"limit": 2, "cursor": "cursor+ /?", "include_archived": False})
    query = parse_qs(urlsplit(records[0].path).query)
    assert query == {"cursor": ["cursor+ /?"], "limit": ["2"], "include_archived": ["false"]}
    assert result == page
    assert len(records) == 1, "has_more must not cause hidden pagination."
    sdk.products.list()
    assert records[1].path == "/v1/products"


def test_25_http_errors_preserve_details_and_unusable_success_stays_distinct(mock: Mock) -> None:
    body = {"detail": "price: amount is required", "error_code": "FUTURE_PROVIDER_CODE",
            "errors": [{"field": "price.amount", "message": "required", "type": "missing"}],
            "doc_url": "https://docs.bachs.io/errors", "future_detail": {"preserved": True}}
    mock.responses = [json_response(body, 400, {"x-request-id": "request-test", "retry-after": "5"})]
    with pytest.raises(BachsApiError) as caught:
        mock.client().products.get("prod_example")
    error = caught.value
    assert (error.status, error.error_code, str(error)) == (400, "FUTURE_PROVIDER_CODE", body["detail"])
    assert error.body == body and error.field_errors == body["errors"]
    assert (error.request_id, error.retry_after) == ("request-test", "5")
    assert len(mock.calls) == 1

    mock.responses = [json_response({"detail": "Not found", "error_code": "NOT_FOUND"}, 404)]
    with pytest.raises(BachsApiError) as caught:
        mock.client().products.get("prod_missing")
    assert caught.value.field_errors is None

    mock.responses = [httpx.Response(502, text="<html>upstream</html>")]
    with pytest.raises(BachsApiError) as caught:
        mock.client(max_retries=0).products.get("prod_example")
    assert caught.value.body == "<html>upstream</html>" and str(caught.value) == "Bachs returned HTTP 502"

    before = len(mock.calls)
    mock.responses = [httpx.Response(200, text="not json")]
    with pytest.raises(BachsResponseError) as response_error:
        mock.client().products.get("prod_example")
    assert response_error.value.status == 200 and isinstance(response_error.value.__cause__, ValueError)
    assert len(mock.calls) == before + 1

    for unusable in [httpx.Response(200, text='{"id": NaN}'), json_response({"id": "prod_example", "name": "Bare"})]:
        mock.responses = [unusable]
        with pytest.raises(BachsResponseError):
            mock.client().products.get("prod_example")
    numeric_amount = product(price={"currency": "USD", "amount": 1200, "price_type": "fixed"})
    mock.responses = [json_response({"items": [numeric_amount], "pagination": {}})]
    with pytest.raises(BachsResponseError):
        mock.client().products.list()


def test_26_connection_failure_preserves_cause_without_inventing_status(mock: Mock) -> None:
    cause = httpx.ConnectError("Simulated connection failure")
    mock.responses = [cause]
    with pytest.raises(BachsNetworkError) as caught:
        mock.client(max_retries=0).products.get("prod_example")
    error = caught.value
    assert not isinstance(error, BachsApiError) and error.__cause__ is cause
    assert error.response_status is None and error.outcome_unknown is False
    assert len(mock.calls) == 1


def test_27_deadline_bounds_waiting_for_headers_and_reading_the_body(mock: Mock, clock: FakeClock) -> None:
    def headers_never_arrive(request: httpx.Request) -> httpx.Response:
        clock.advance(0.04)
        raise httpx.ReadTimeout("Simulated", request=request)

    mock.handler = headers_never_arrive
    with pytest.raises(BachsTimeoutError) as caught:
        mock.client(timeout=0.04).products.get("prod_example")
    assert mock.calls[0].timeout["read"] == pytest.approx(0.04), "Each attempt is bounded by the remaining budget."
    assert caught.value.response_status is None

    def slow_body() -> Iterator[bytes]:
        yield b'{"id": "prod_example",'
        clock.advance(0.02)
        yield b'"name": "Pro Plan"}'

    mock.handler = lambda _request: httpx.Response(200, content=slow_body())
    with pytest.raises(BachsTimeoutError) as caught:
        mock.client(timeout=1).products.get("prod_example", timeout=0.02)
    assert caught.value.response_status == 200 and caught.value.outcome_unknown is False


def test_29_reads_recover_exhaust_their_limit_and_respect_hints_and_deadline(mock: Mock, clock: FakeClock) -> None:
    mock.responses = [json_response({"detail": "busy"}, 429, {"retry-after": "1"}),
                      json_response({"detail": "busy"}, 503), product()]
    assert mock.client().products.get("prod_example")["id"] == "prod_example"
    assert len(mock.calls) == 3 and clock.sleeps == [1.0, 1.0]

    mock.calls.clear()
    clock.sleeps.clear()
    mock.responses = [httpx.ReadError("connection lost"), product()]
    assert mock.client().products.get("prod_example")["id"] == "prod_example"
    assert len(mock.calls) == 2 and clock.sleeps == [0.5]

    mock.calls.clear()
    clock.sleeps.clear()
    mock.responses = [json_response({"detail": "busy"}, 500), json_response({"detail": "busy"}, 502),
                      json_response({"detail": "still busy"}, 503)]
    with pytest.raises(BachsApiError) as exhausted:
        mock.client().products.get("prod_example")
    assert exhausted.value.status == 503 and exhausted.value.outcome_unknown is False, "A failed read changes nothing."
    assert len(mock.calls) == 3 and clock.sleeps == [0.5, 1.0]

    for status in (400, 401, 403, 404, 409, 501):
        mock.calls.clear()
        mock.responses = [json_response({"detail": "do not retry"}, status)]
        with pytest.raises(BachsApiError) as caught:
            mock.client().products.get("prod_example")
        assert caught.value.status == status and len(mock.calls) == 1

    mock.calls.clear()
    mock.responses = [json_response({"detail": "wait longer"}, 429, {"retry-after": "10"})]
    with pytest.raises(BachsApiError):
        mock.client(timeout=1).products.get("prod_example")
    assert len(mock.calls) == 1

    mock.calls.clear()
    mock.responses = [json_response({"detail": "no retry requested"}, 503)]
    with pytest.raises(BachsApiError):
        mock.client().products.get("prod_example", max_retries=0)
    assert len(mock.calls) == 1


def test_30_writes_send_once_preserve_keys_and_expose_uncertain_outcomes(
    mock: Mock, server: Any, clock: FakeClock
) -> None:
    payload: Any = {"name": "Pro Plan", "price": {"currency": "USD", "amount": "12.00"}}
    failure = {"detail": "server failure", "error_code": "INTERNAL_SERVER_ERROR"}
    base_url, records = server(lambda _record: respond(failure, 500))
    with pytest.raises(BachsApiError) as caught:
        Bachs(api_key=KEY, environment="sandbox", base_url=base_url, max_retries=5).products.create(
            payload, idempotency_key="catalog-pro-plan"
        )
    assert caught.value.status == 500 and caught.value.outcome_unknown is True
    assert len(records) == 1 and records[0].headers["idempotency-key"] == "catalog-pro-plan"
    assert json.loads(records[0].body) == payload

    cause = httpx.ReadError("Response lost")
    mock.responses = [cause]
    with pytest.raises(BachsNetworkError) as lost:
        mock.client(max_retries=5).products.create(payload, idempotency_key="catalog-pro-plan")
    assert lost.value.outcome_unknown is True and lost.value.__cause__ is cause
    assert len(mock.calls) == 1 and mock.calls[0].headers["idempotency-key"] == "catalog-pro-plan"
    assert clock.sleeps == []

    for bad_key in (" bad key ", "", "a\nb"):
        with pytest.raises(BachsConfigError):
            mock.client().products.create(payload, idempotency_key=bad_key)
    assert len(mock.calls) == 1
