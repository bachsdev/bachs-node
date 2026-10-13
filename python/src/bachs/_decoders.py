"""Response guards: validate the fields each type promises, then return the actual object with any extra fields."""

from __future__ import annotations

import math
from collections.abc import Callable, Iterable
from typing import Any, TypeVar, cast

from . import types as t

T = TypeVar("T")
Check = Callable[[Any], bool]


def record(value: Any) -> bool:
    return isinstance(value, dict)


def _str(value: Any) -> bool:
    return isinstance(value, str)


def _num(value: Any) -> bool:
    # bool is an int subclass in Python, but not a JSON number.
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def _bool(value: Any) -> bool:
    return isinstance(value, bool)


def _nullable_str(value: Any) -> bool:
    return value is None or _str(value)


def _nullable_record(value: Any) -> bool:
    return value is None or record(value)


def _list_of(check: Check) -> Check:
    return lambda value: isinstance(value, list) and all(check(item) for item in value)


def _optional(value: dict[str, Any], key: str, check: Check) -> bool:
    return key not in value or check(value[key])


def _strings(
    value: dict[str, Any], required: Iterable[str], ordinary: Iterable[str] = (), nullable: Iterable[str] = ()
) -> bool:
    return (
        all(_str(value.get(key)) for key in required)
        and all(_optional(value, key, _str) for key in ordinary)
        and all(_optional(value, key, _nullable_str) for key in nullable)
    )


def _cadence(value: Any) -> bool:
    return (
        record(value)
        and _optional(value, "interval", lambda v: v in ("day", "week", "month", "year"))
        and _optional(value, "frequency", _num)
    )


def _pagination(value: Any) -> bool:
    return (
        record(value)
        and _strings(value, [], [], ["next_cursor", "prev_cursor"])
        and all(_optional(value, key, _num) for key in ("limit", "offset", "returned", "total"))
        and _optional(value, "has_more", _bool)
    )


# Products


def _currency_option(value: Any) -> bool:
    return record(value) and _strings(
        value, ["currency"], [], ["amount", "preset_amount", "minimum_amount", "maximum_amount"]
    )


def _price(value: Any) -> bool:
    return (
        record(value)
        and _strings(value, ["currency", "amount"], [], ["preset_amount", "minimum_amount", "maximum_amount"])
        and value.get("price_type") in ("fixed", "free", "custom")
        and _optional(value, "currency_options", _list_of(_currency_option))
    )


def _currency_price(value: Any) -> bool:
    return (
        record(value)
        and _strings(value, [], ["currency", "amount"], ["minimum_amount", "maximum_amount"])
        and _optional(value, "is_default", _bool)
    )


def _product(value: Any) -> bool:
    return (
        record(value)
        and _strings(
            value,
            ["id", "name"],
            ["organization_id", "status", "actor_id", "created_at", "updated_at", "total_amount"],
            ["description", "archived_at"],
        )
        and _price(value.get("price"))
        and _optional(value, "metadata", _nullable_record)
        and _optional(value, "media", _list_of(record))
        and _optional(value, "billing_cycle", lambda v: v is None or _cadence(v))
        and _optional(value, "prices", _list_of(_currency_price))
        and _optional(value, "total_payments", _num)
    )


def _product_list(value: Any) -> bool:
    return record(value) and _list_of(_product)(value.get("items")) and _pagination(value.get("pagination"))


# Checkout sessions and payments


def _identity(value: Any) -> bool:
    return record(value) and _strings(value, [], [], ["id", "email", "name"])


def _payment(value: Any) -> bool:
    return (
        record(value)
        and _strings(
            value,
            ["payment_id", "status", "amount", "currency", "created_at", "updated_at"],
            ["billing_reason"],
            ["reference", "checkout_id", "subscription_id", "fee_usd", "amount_paid", "amount_remaining",
             "payment_method", "completed_at"],
        )
        and _optional(value, "is_refundable", lambda v: v is None or _bool(v))
        and _optional(value, "meta", _nullable_record)
    )


def _payment_list_item(value: Any) -> bool:
    return record(value) and _strings(
        value,
        ["status", "amount", "currency", "customer_name", "customer_email"],
        [],
        ["id", "reference", "amount_paid", "amount_remaining", "settlement_amount", "settlement_currency", "fee",
         "vat", "transaction_date", "completed_at"],
    )


def _payment_pagination(value: Any) -> bool:
    return (
        _pagination(value)
        and _bool(value.get("has_more"))
        and all(_num(value.get(key)) for key in ("limit", "offset", "returned", "total"))
    )


def _payments(value: Any) -> bool:
    return (
        record(value)
        and _list_of(_payment_list_item)(value.get("items"))
        and _payment_pagination(value.get("pagination"))
    )


def _created_checkout(value: Any) -> bool:
    return (
        record(value)
        and _strings(value, ["checkout_id", "checkout_url", "status", "expires_at", "created_at"])
        and "reference" in value
        and _nullable_str(value["reference"])
    )


def _checkout(value: Any) -> bool:
    return (
        record(value)
        and _strings(
            value,
            ["checkout_id", "status"],
            ["amount", "currency", "created_at", "updated_at"],
            ["payment_status", "source_type", "reference", "payment_method", "success_url", "cancel_url",
             "billing_currency", "session_mode", "expires_at", "completed_at"],
        )
        and _optional(value, "charge", lambda v: v is None or _payment(v))
        and all(_optional(value, key, lambda v: v is None or _identity(v)) for key in ("customer", "customer_details"))
        and _optional(value, "metadata", _nullable_record)
    )


# Subscriptions and customer portal


def _subscription_customer(value: Any) -> bool:
    return record(value) and _strings(value, [], ["customer_id"], ["email", "name", "phone_number"])


def _subscription_item(value: Any) -> bool:
    return (
        record(value)
        and _strings(value, [], ["id", "status", "price_type", "unit_amount", "currency"],
                     ["previously_billed_at", "next_billed_at"])
        and _optional(value, "quantity", _num)
        and _optional(value, "recurring", _bool)
    )


def _subscription(value: Any) -> bool:
    return (
        record(value)
        and _strings(
            value,
            ["id", "status"],
            ["collection_method", "currency", "amount", "current_period_start", "current_period_end", "created_at"],
            ["payment_method_id", "previously_billed_at", "next_billed_at", "trial_end", "canceled_at"],
        )
        and _optional(value, "customer", _subscription_customer)
        and _optional(value, "billing_cycle", _cadence)
        and _optional(value, "quantity", _num)
        and _optional(value, "cancel_at_period_end", _bool)
        and _optional(value, "items", _list_of(_subscription_item))
        and _optional(value, "metadata", record)
    )


def _subscriptions(value: Any) -> bool:
    return record(value) and _list_of(_subscription)(value.get("items")) and _pagination(value.get("pagination"))


def _portal(value: Any) -> bool:
    return record(value) and _strings(value, ["id", "url"])


# Balances and banks


def _balance(value: Any) -> bool:
    return record(value) and _strings(
        value, ["currency", "available_balance", "pending_balance"], ["held_for_disputes"]
    )


def _balances(value: Any) -> bool:
    return (
        record(value)
        and _strings(value, ["account_id", "total_balance_usd"])
        and _list_of(_balance)(value.get("balances"))
        and _optional(value, "pending_settlements_by_day", _list_of(record))
    )


def _bank(value: Any) -> bool:
    return record(value) and _strings(value, ["name", "code"])


def _banks(value: Any) -> bool:
    return record(value) and _str(value.get("country")) and _list_of(_bank)(value.get("banks"))


def _resolved_account(value: Any) -> bool:
    return (
        record(value)
        and _bool(value.get("resolved"))
        and all(key in value and _nullable_str(value[key]) for key in ("account_name", "account_number", "message"))
    )


# Payouts


def _destination(value: Any) -> bool:
    return (
        record(value)
        and _strings(
            value,
            ["id", "name", "type", "currency", "status"],
            [],
            ["status_reason", "account_number", "account_name", "bank_code", "bank_name", "phone_number",
             "mobile_provider", "wallet_address", "network", "reviewed_at", "created_at", "updated_at"],
        )
        and _optional(value, "is_usable", _bool)
        and _optional(value, "is_default", _bool)
    )


def _destinations(value: Any) -> bool:
    return (
        record(value)
        and _list_of(_destination)(value.get("destinations"))
        and all(_num(value.get(key)) for key in ("total", "limit", "offset"))
    )


def _quote(value: Any) -> bool:
    return record(value) and _strings(
        value, ["quote_id", "from_currency", "to_currency", "from_amount", "to_amount", "exchange_rate", "expires_at"]
    )


def _payout(value: Any) -> bool:
    return record(value) and _strings(
        value,
        ["id", "status", "amount", "currency"],
        [],
        ["source_currency", "fee", "total_debited", "destination", "reference", "failure_reason", "created_at",
         "completed_at"],
    )


def _payouts(value: Any) -> bool:
    return record(value) and _num(value.get("total")) and _list_of(_payout)(value.get("items"))


def _decoder(check: Check, shape: str, result: type[T]) -> Callable[[Any], T]:
    def decode(value: Any) -> T:
        if not check(value):
            raise ValueError(f"Response does not match the supported {shape} shape.")
        return cast(T, value)

    return decode


decode_product = _decoder(_product, "product", t.ProductResponse)
decode_product_list = _decoder(_product_list, "product list", t.ProductListResponse)
decode_checkout_created = _decoder(_created_checkout, "checkout creation", t.CheckoutSessionCreated)
decode_checkout = _decoder(_checkout, "checkout", t.CheckoutSessionResponse)
decode_payment = _decoder(_payment, "payment", t.PaymentResponse)
decode_payments = _decoder(_payments, "payment list", t.PaymentListResponse)
decode_subscription = _decoder(_subscription, "subscription", t.SubscriptionResponse)
decode_subscriptions = _decoder(_subscriptions, "subscription list", t.SubscriptionListResponse)
decode_portal = _decoder(_portal, "portal session", t.PortalSessionResponse)
decode_balances = _decoder(_balances, "balances", t.BalancesResponse)
decode_banks = _decoder(_banks, "banks", t.BankListResponse)
decode_resolved_account = _decoder(_resolved_account, "bank account resolution", t.ResolveBankAccountResponse)
decode_destination = _decoder(_destination, "payout destination", t.PayoutDestinationResponse)
decode_destinations = _decoder(_destinations, "payout destination list", t.PayoutDestinationListResponse)
decode_quote = _decoder(_quote, "payout quote", t.PayoutQuoteResponse)
decode_payout = _decoder(_payout, "payout", t.PayoutResponse)
decode_payouts = _decoder(_payouts, "payout list", t.PayoutListResponse)
