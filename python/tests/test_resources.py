"""Port of test/batch-4.test.mjs: checkout, payments, subscriptions, portal, balances, banks and payouts."""

from __future__ import annotations

from typing import Any

from conftest import Mock

created = {"checkout_id": "chk_synthetic", "checkout_url": "https://checkout.example.com/synthetic", "status": "open",
           "expires_at": "2026-10-03T13:00:00Z", "created_at": "2026-10-03T12:00:00Z", "reference": None}
payment = {"payment_id": "pay_synthetic", "status": "succeeded", "amount": "12.00", "currency": "USD",
           "created_at": "2026-10-03T12:00:00Z", "updated_at": "2026-10-03T12:01:00Z"}
pagination = {"has_more": False, "limit": 1, "offset": 0, "returned": 1, "total": 1, "next_cursor": None,
              "prev_cursor": None}
subscription = {"id": "sub_synthetic", "status": "active", "amount": "12.00", "currency": "USD",
                "customer": {"customer_id": "cust_synthetic", "email": "synthetic@example.com"},
                "billing_cycle": {"interval": "month", "frequency": 1}, "cancel_at_period_end": False,
                "items": [{"id": "si_synthetic", "quantity": 1, "recurring": True, "unit_amount": "12.00"}]}
destination = {"id": "pd_synthetic", "name": "Synthetic destination", "type": "bank_account", "currency": "NGN",
               "status": "pending_review", "is_usable": False, "account_number": None}
quote = {"quote_id": "pqt_synthetic", "from_currency": "USD", "to_currency": "NGN", "from_amount": "1.00",
         "to_amount": "1400.00", "exchange_rate": "1400.00", "expires_at": "2026-10-03T12:01:00Z"}
payout = {"id": "pay_synthetic_payout", "status": "pending", "amount": "1400.00", "currency": "NGN",
          "source_currency": "USD", "fee": "0.10", "total_debited": "1.10", "destination": "pd_synthetic"}


def harness(mock: Mock, responses: list[Any]) -> Any:
    mock.responses = responses
    return mock.client(api_key="synthetic-key", max_retries=0)


def test_31_recurring_product_checkout_preserves_inputs_and_operation_key(mock: Mock) -> None:
    sdk = harness(mock, [{**created, "future_field": True}])
    payload = {"product_cart": [{"product_id": "prod_synthetic", "quantity": 1}],
               "customer": {"email": "synthetic@example.com", "name": "Synthetic Customer"},
               "metadata": {"order": "synthetic-order"}}
    result = sdk.checkout_sessions.create(payload, idempotency_key="synthetic-checkout-001")
    call = mock.calls[0]
    assert (call.method, call.url.path, call.body) == ("POST", "/v1/checkout-sessions", payload)
    assert "success_url" not in call.body
    assert call.headers["authorization"] == "Bearer synthetic-key"
    assert call.headers["idempotency-key"] == "synthetic-checkout-001"
    assert result["future_field"] is True and result["checkout_id"] == created["checkout_id"]


def test_32_raw_checkout_and_retrieval_preserve_pricing_nullable_payment_and_encoded_id(mock: Mock) -> None:
    sdk = harness(mock, [
        created,
        {"checkout_id": "chk/a", "status": "open", "amount": "12.00", "currency": "USD", "charge": None,
         "customer": None, "customer_details": None},
        {"checkout_id": "chk_paid", "status": "completed", "charge": payment},
    ])
    sdk.checkout_sessions.create({"pricing": {"currency": "USD", "amount": "12.00"},
                                  "success_url": "https://example.com/success", "cancel_url": None,
                                  "customer_creation": "always", "payment_method_types": ["USD_CARD"]})
    body = mock.calls[0].body
    assert body["pricing"]["amount"] == "12.00" and body["cancel_url"] is None and body["customer_creation"] == "always"
    opened = sdk.checkout_sessions.get("chk/a")
    assert opened["charge"] is None
    assert mock.calls[1].url.raw_path == b"/v1/checkout-sessions/chk%2Fa" and mock.calls[1].body is None
    assert sdk.checkout_sessions.get("chk_paid")["charge"]["payment_id"] == payment["payment_id"]


def test_33_payment_retrieval_and_list_keep_distinct_identifiers_and_paging(mock: Mock) -> None:
    item = {"id": payment["payment_id"], "status": "succeeded", "amount": "12.00", "currency": "USD",
            "customer_name": "Synthetic", "customer_email": "synthetic@example.com", "substatus": "future_detail"}
    sdk = harness(mock, [payment, {"items": [item], "pagination": pagination}])
    assert sdk.payments.get("pay_synthetic") == payment
    page = sdk.payments.list({"limit": 1, "offset": 0, "status_filter": "succeeded"})
    assert mock.calls[0].url.path == "/v1/payments/pay_synthetic"
    assert mock.calls[1].url.params["offset"] == "0" and mock.calls[1].url.params["status_filter"] == "succeeded"
    assert page["items"][0]["id"] == payment["payment_id"] and "payment_id" not in page["items"][0]
    assert page["items"][0]["substatus"] == "future_detail" and page["pagination"] == pagination
    assert len(mock.calls) == 2


def test_34_subscription_retrieval_and_list_support_customer_lookup(mock: Mock) -> None:
    sdk = harness(mock, [subscription, {"items": [subscription], "pagination": pagination}])
    single = sdk.subscriptions.get("sub_synthetic")
    assert single["customer"]["customer_id"] == "cust_synthetic" and single["items"][0]["unit_amount"] == "12.00"
    page = sdk.subscriptions.list({"customer_id": "cust_synthetic", "status": "active", "limit": 1, "offset": 0})
    assert mock.calls[1].method == "GET" and mock.calls[1].url.params["customer_id"] == "cust_synthetic"
    assert len(page["items"]) == 1 and len(mock.calls) == 2


def test_35_immediate_cancellation_uses_delete_with_explicit_false_reason_and_key(mock: Mock) -> None:
    canceled = {**subscription, "status": "canceled", "next_billed_at": None, "canceled_at": "2026-10-03T12:00:00Z"}
    sdk = harness(mock, [canceled])
    result = sdk.subscriptions.cancel("sub_synthetic", {"cancel_at_period_end": False,
                                                        "reason": "Synthetic cancellation"},
                                      idempotency_key="synthetic-cancel")
    call = mock.calls[0]
    assert (call.method, call.url.path) == ("DELETE", "/v1/subscriptions/sub_synthetic")
    assert call.body["cancel_at_period_end"] is False and call.headers["idempotency-key"] == "synthetic-cancel"
    assert result["status"] == "canceled" and result["next_billed_at"] is None


def test_36_period_end_cancellation_returns_scheduled_rather_than_final(mock: Mock) -> None:
    sdk = harness(mock, [{**subscription, "cancel_at_period_end": True}, {**subscription, "status": "canceled"}])
    result = sdk.subscriptions.cancel("sub_synthetic", {"cancel_at_period_end": True})
    assert result["status"] == "active" and result["cancel_at_period_end"] is True
    assert mock.calls[0].body["cancel_at_period_end"] is True
    sdk.subscriptions.cancel("sub_synthetic")
    assert mock.calls[1].body == {}


def test_37_hosted_portal_issues_one_customer_scoped_session_without_invented_fields(mock: Mock) -> None:
    sdk = harness(mock, [{"id": "psn_synthetic", "url": "https://portal.example.com/s/synthetic-credential"}])
    result = sdk.customer_portal.create_session("cust/a")
    call = mock.calls[0]
    assert call.url.raw_path == b"/v1/customers/cust%2Fa/portal-sessions" and call.method == "POST"
    assert call.body is None and "content-type" not in call.headers and result["id"] == "psn_synthetic"


def test_38_balances_and_bank_lookup_keep_decimal_strings_codes_and_unresolved_outcome(mock: Mock) -> None:
    balances = {"account_id": "acct_synthetic", "total_balance_usd": "123.45",
                "balances": [{"currency": "USD", "available_balance": "123.45", "pending_balance": "0.00",
                              "held_for_disputes": "0.00"}]}
    unresolved = {"resolved": False, "account_name": None, "account_number": None,
                  "message": "Synthetic unsupported bank"}
    sdk = harness(mock, [balances, {"country": "NG", "banks": [{"name": "Synthetic Bank", "code": "001"}]}, unresolved])
    assert sdk.balances.get() == balances
    assert sdk.banks.list({"country": "NG"})["banks"][0]["code"] == "001"
    result = sdk.banks.resolve_account({"account_number": "0000000000", "bank_code": "001", "country": "NG"})
    assert result["resolved"] is False and result["account_name"] is None
    assert mock.calls[1].url.path == "/v1/reference/banks"
    assert (mock.calls[2].method, mock.calls[2].url.path) == ("POST", "/v1/misc/bank-accounts/resolve")
    assert mock.calls[2].body["account_number"] == "0000000000"


def test_39_destination_review_and_usability_come_from_bachs_and_list_envelope_is_kept(mock: Mock) -> None:
    approved = {**destination, "status": "approved", "is_usable": True}
    sdk = harness(mock, [destination, approved, {"destinations": [approved], "total": 1, "limit": 20, "offset": 0}])
    pending = sdk.payout_destinations.create({"currency": "NGN", "account_number": "0000000000", "bank_code": "001",
                                              "label": "Synthetic"})
    assert pending["is_usable"] is False
    assert sdk.payout_destinations.get("pd_synthetic")["is_usable"] is True
    page = sdk.payout_destinations.list({"status": "approved", "currency": "NGN", "offset": 0})
    assert page["destinations"][0]["status"] == "approved" and "items" not in page
    assert mock.calls[2].url.params["status"] == "approved" and mock.calls[0].body["label"] == "Synthetic"
    assert len(mock.calls) == 3


def test_40_cross_currency_quote_and_payout_preserve_both_currencies_and_history(mock: Mock) -> None:
    sdk = harness(mock, [quote, payout, payout, {"items": [payout], "total": 1},
                         {**payout, "amount": "100.00", "currency": "NGN", "source_currency": "NGN"}])
    quoted = sdk.payout_quotes.create({"from_currency": "USD", "to_currency": "NGN", "amount": "1.00"})
    created_payout = sdk.payouts.create({"destination": "pd_synthetic", "quote_id": quoted["quote_id"],
                                         "reference": "synthetic"}, idempotency_key="synthetic-payout")
    assert (created_payout["status"], created_payout["currency"]) == ("pending", "NGN")
    assert (created_payout["source_currency"], created_payout["total_debited"]) == ("USD", "1.10")
    assert "amount" not in mock.calls[1].body
    assert sdk.payouts.get(created_payout["id"])["id"] == created_payout["id"]
    assert sdk.payouts.list({"offset": 0, "status_filter": "pending"})["total"] == 1
    assert mock.calls[3].url.params["status_filter"] == "pending"
    sdk.payouts.create({"destination": "pd_synthetic", "amount": "100.00"})
    assert "quote_id" not in mock.calls[4].body and len(mock.calls) == 5
