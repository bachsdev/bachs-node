"""Request and response shapes. Fields keep Bachs snake_case and money stays in decimal strings.

Responses are plain ``dict`` objects at runtime. The SDK validates the fields promised below and
returns the actual object, so additional fields Bachs adds later are retained.
"""

from __future__ import annotations

from typing import Any, Literal, TypeAlias, Union

from typing_extensions import NotRequired, TypedDict

JsonValue: TypeAlias = Union[None, bool, int, float, str, list["JsonValue"], dict[str, "JsonValue"]]

ProductCurrency = Literal["USD", "NGN", "GHS", "KES", "MWK", "RWF", "TZS", "UGX", "XAF", "XOF", "ZMW"]
PriceType = Literal["fixed", "free", "custom"]

# Products


class FixedCurrencyOptionInput(TypedDict):
    currency: ProductCurrency
    amount: str


class FreeCurrencyOptionInput(TypedDict):
    currency: ProductCurrency
    amount: NotRequired[None]


class CustomCurrencyOptionInput(TypedDict):
    currency: ProductCurrency
    amount: NotRequired[None]
    preset_amount: NotRequired[str | None]
    minimum_amount: NotRequired[str | None]
    maximum_amount: NotRequired[str | None]


class FixedPriceInput(TypedDict):
    currency: ProductCurrency
    price_type: NotRequired[Literal["fixed"]]
    amount: str
    currency_options: NotRequired[list[FixedCurrencyOptionInput] | None]


class FreePriceInput(TypedDict):
    currency: ProductCurrency
    price_type: Literal["free"]
    amount: NotRequired[None]
    currency_options: NotRequired[list[FreeCurrencyOptionInput] | None]


class CustomPriceInput(TypedDict):
    currency: ProductCurrency
    price_type: Literal["custom"]
    amount: NotRequired[None]
    preset_amount: NotRequired[str | None]
    minimum_amount: NotRequired[str | None]
    maximum_amount: NotRequired[str | None]
    currency_options: NotRequired[list[CustomCurrencyOptionInput] | None]


PriceInput = Union[FixedPriceInput, FreePriceInput, CustomPriceInput]


class SubscriptionCadence(TypedDict, total=False):
    """The published cadence schema does not specify a required-field list."""

    interval: Literal["day", "week", "month", "year"]
    frequency: int


class CreateProductRequest(TypedDict):
    name: str
    description: NotRequired[str | None]
    price: PriceInput
    metadata: NotRequired[dict[str, JsonValue] | None]
    billing_cycle: NotRequired[SubscriptionCadence | None]


class ProductListParams(TypedDict, total=False):
    limit: int
    cursor: str
    include_archived: bool


class CurrencyOptionResponse(TypedDict):
    currency: str
    amount: NotRequired[str | None]
    preset_amount: NotRequired[str | None]
    minimum_amount: NotRequired[str | None]
    maximum_amount: NotRequired[str | None]


class PriceResponse(TypedDict):
    currency: str
    price_type: PriceType
    amount: str
    preset_amount: NotRequired[str | None]
    minimum_amount: NotRequired[str | None]
    maximum_amount: NotRequired[str | None]
    currency_options: NotRequired[list[CurrencyOptionResponse]]


class ProductCurrencyPrice(TypedDict, total=False):
    currency: str
    amount: str
    minimum_amount: str | None
    maximum_amount: str | None
    is_default: bool


class ProductResponse(TypedDict):
    id: str
    name: str
    price: PriceResponse
    organization_id: NotRequired[str]
    description: NotRequired[str | None]
    status: NotRequired[str]
    metadata: NotRequired[dict[str, Any] | None]
    media: NotRequired[list[dict[str, Any]]]
    actor_id: NotRequired[str]
    created_at: NotRequired[str]
    updated_at: NotRequired[str]
    archived_at: NotRequired[str | None]
    billing_cycle: NotRequired[SubscriptionCadence | None]
    prices: NotRequired[list[ProductCurrencyPrice]]
    total_payments: NotRequired[float]
    total_amount: NotRequired[str]


class PaginationResponse(TypedDict, total=False):
    next_cursor: str | None
    prev_cursor: str | None
    has_more: bool
    limit: int
    offset: int
    returned: int
    total: int


class ProductListResponse(TypedDict):
    items: list[ProductResponse]
    pagination: PaginationResponse


# Checkout sessions

PaymentMethodCorridor = Literal[
    "USD_CARD", "NGN_CARD", "NGN_BANK_TRANSFER", "MOMO_GHS", "MOMO_KES", "MOMO_TZS", "MOMO_UGX",
    "MOMO_XAF", "MOMO_XOF", "MOMO_RWF", "MOMO_MWK", "MOMO_ZMW", "CRYPTO",
]


class ExistingCustomerInput(TypedDict):
    customer_id: str


class NewCustomerInput(TypedDict):
    email: str
    name: str
    phone_number: NotRequired[str | None]


CustomerInput = Union[ExistingCustomerInput, NewCustomerInput]


class CheckoutPricing(TypedDict):
    currency: str
    amount: NotRequired[str]
    price_type: NotRequired[PriceType]
    preset_amount: NotRequired[str]
    minimum_amount: NotRequired[str]
    maximum_amount: NotRequired[str]
    currency_options: NotRequired[dict[str, str]]


class CartPriceOverride(TypedDict, total=False):
    price_type: PriceType
    amount: str | None
    preset_amount: str | None
    minimum_amount: str | None
    maximum_amount: str | None


class CheckoutCartItem(TypedDict):
    product_id: str
    quantity: NotRequired[int]
    amount: NotRequired[str | None]
    pricing: NotRequired[CartPriceOverride | None]


class _CheckoutCommonInput(TypedDict, total=False):
    customer: CustomerInput | None
    customer_creation: Literal["always", "if_required"]
    billing_currency: str | None
    payment_method_types: list[PaymentMethodCorridor] | None
    success_url: str
    cancel_url: str | None
    reference: str | None
    metadata: dict[str, JsonValue] | None
    expires_in_minutes: int


class CartCheckoutSessionRequest(_CheckoutCommonInput):
    product_cart: list[CheckoutCartItem]


class PricingCheckoutSessionRequest(_CheckoutCommonInput):
    pricing: CheckoutPricing


# Supply exactly one of product_cart or pricing.
CreateCheckoutSessionRequest = Union[CartCheckoutSessionRequest, PricingCheckoutSessionRequest]


class CheckoutSessionCreated(TypedDict):
    checkout_id: str
    checkout_url: str
    status: str
    expires_at: str
    created_at: str
    reference: str | None


class CheckoutIdentity(TypedDict, total=False):
    id: str | None
    email: str | None
    name: str | None


# Payments

PaymentStatusFilter = Literal[
    "created", "processing", "succeeded", "accepted", "failed", "expired", "cancelled", "refunded",
    "partially_refunded", "auto_refunded", "underpaid", "overpaid",
]


class PaymentResponse(TypedDict):
    payment_id: str
    status: str
    amount: str
    currency: str
    created_at: str
    updated_at: str
    reference: NotRequired[str | None]
    checkout_id: NotRequired[str | None]
    subscription_id: NotRequired[str | None]
    billing_reason: NotRequired[str]
    fee_usd: NotRequired[str | None]
    amount_paid: NotRequired[str | None]
    amount_remaining: NotRequired[str | None]
    payment_method: NotRequired[str | None]
    completed_at: NotRequired[str | None]
    is_refundable: NotRequired[bool | None]
    meta: NotRequired[dict[str, Any] | None]


class CheckoutSessionResponse(TypedDict):
    checkout_id: str
    status: str
    amount: NotRequired[str]
    currency: NotRequired[str]
    payment_status: NotRequired[str | None]
    source_type: NotRequired[str | None]
    reference: NotRequired[str | None]
    charge: NotRequired[PaymentResponse | None]
    payment_method: NotRequired[str | None]
    customer: NotRequired[CheckoutIdentity | None]
    customer_details: NotRequired[CheckoutIdentity | None]
    success_url: NotRequired[str | None]
    cancel_url: NotRequired[str | None]
    billing_currency: NotRequired[str | None]
    session_mode: NotRequired[str | None]
    metadata: NotRequired[dict[str, Any] | None]
    created_at: NotRequired[str]
    expires_at: NotRequired[str | None]
    completed_at: NotRequired[str | None]
    updated_at: NotRequired[str]


class PaymentListItem(TypedDict):
    id: NotRequired[str | None]
    status: str
    amount: str
    currency: str
    customer_name: str
    customer_email: str
    reference: NotRequired[str | None]
    amount_paid: NotRequired[str | None]
    amount_remaining: NotRequired[str | None]
    settlement_amount: NotRequired[str | None]
    settlement_currency: NotRequired[str | None]
    fee: NotRequired[str | None]
    vat: NotRequired[str | None]
    transaction_date: NotRequired[str | None]
    completed_at: NotRequired[str | None]


class PaymentListParams(TypedDict, total=False):
    limit: int
    offset: int
    status_filter: PaymentStatusFilter


class PaymentPagination(TypedDict):
    has_more: bool
    limit: int
    offset: int
    returned: int
    total: int
    next_cursor: NotRequired[str | None]
    prev_cursor: NotRequired[str | None]


class PaymentListResponse(TypedDict):
    items: list[PaymentListItem]
    pagination: PaymentPagination


# Subscriptions and customer portal


class SubscriptionCustomer(TypedDict, total=False):
    customer_id: str
    email: str | None
    name: str | None
    phone_number: str | None


class SubscriptionItem(TypedDict, total=False):
    id: str
    status: str
    quantity: float
    recurring: bool
    price_type: str
    unit_amount: str
    currency: str
    previously_billed_at: str | None
    next_billed_at: str | None


class SubscriptionResponse(TypedDict):
    id: str
    status: str
    customer: NotRequired[SubscriptionCustomer]
    payment_method_id: NotRequired[str | None]
    collection_method: NotRequired[str]
    currency: NotRequired[str]
    amount: NotRequired[str]
    billing_cycle: NotRequired[SubscriptionCadence]
    quantity: NotRequired[float]
    current_period_start: NotRequired[str]
    current_period_end: NotRequired[str]
    previously_billed_at: NotRequired[str | None]
    next_billed_at: NotRequired[str | None]
    trial_end: NotRequired[str | None]
    cancel_at_period_end: NotRequired[bool]
    canceled_at: NotRequired[str | None]
    created_at: NotRequired[str]
    items: NotRequired[list[SubscriptionItem]]
    metadata: NotRequired[dict[str, Any]]


class SubscriptionListParams(TypedDict, total=False):
    limit: int
    offset: int
    customer_id: str
    status: Literal["trialing", "active", "past_due", "unpaid", "canceled"]


class SubscriptionListResponse(TypedDict):
    items: list[SubscriptionResponse]
    pagination: PaginationResponse


class CancelSubscriptionRequest(TypedDict, total=False):
    cancel_at_period_end: bool
    reason: str | None


class PortalSessionResponse(TypedDict):
    id: str
    url: str


# Balances and banks


class Balance(TypedDict):
    currency: str
    available_balance: str
    pending_balance: str
    held_for_disputes: NotRequired[str]


class BalancesResponse(TypedDict):
    account_id: str
    balances: list[Balance]
    total_balance_usd: str
    pending_settlements_by_day: NotRequired[list[dict[str, Any]]]


class Bank(TypedDict):
    name: str
    code: str


class BankListParams(TypedDict, total=False):
    country: str


class BankListResponse(TypedDict):
    country: str
    banks: list[Bank]


class ResolveBankAccountRequest(TypedDict):
    account_number: str
    bank_code: str
    country: NotRequired[str | None]


class ResolveBankAccountResponse(TypedDict):
    resolved: bool
    account_name: str | None
    account_number: str | None
    message: str | None


# Payouts


class CreatePayoutDestinationRequest(TypedDict):
    currency: str
    name: NotRequired[str | None]
    label: NotRequired[str | None]
    type: NotRequired[str | None]
    destination_type: NotRequired[str | None]
    account_number: NotRequired[str | None]
    bank_code: NotRequired[str | None]
    account_name: NotRequired[str | None]
    bank_name: NotRequired[str | None]
    phone_number: NotRequired[str | None]
    mobile_provider: NotRequired[str | None]
    wallet_address: NotRequired[str | None]
    network: NotRequired[str | None]
    metadata: NotRequired[dict[str, JsonValue] | None]


class PayoutDestinationResponse(TypedDict):
    id: str
    name: str
    type: str
    currency: str
    status: str
    is_usable: NotRequired[bool]
    is_default: NotRequired[bool]
    status_reason: NotRequired[str | None]
    account_number: NotRequired[str | None]
    account_name: NotRequired[str | None]
    bank_code: NotRequired[str | None]
    bank_name: NotRequired[str | None]
    phone_number: NotRequired[str | None]
    mobile_provider: NotRequired[str | None]
    wallet_address: NotRequired[str | None]
    network: NotRequired[str | None]
    reviewed_at: NotRequired[str | None]
    created_at: NotRequired[str | None]
    updated_at: NotRequired[str | None]


class PayoutDestinationListParams(TypedDict, total=False):
    currency: str
    status: Literal["pending_review", "approved", "rejected"]
    limit: int
    offset: int


class PayoutDestinationListResponse(TypedDict):
    destinations: list[PayoutDestinationResponse]
    total: int
    limit: int
    offset: int


class CreatePayoutQuoteRequest(TypedDict):
    from_currency: str
    to_currency: str
    amount: str
    payout_method: NotRequired[str | None]


class PayoutQuoteResponse(TypedDict):
    quote_id: str
    from_currency: str
    to_currency: str
    from_amount: str
    to_amount: str
    exchange_rate: str
    expires_at: str


class _CreatePayoutCommon(TypedDict):
    destination: str
    reference: NotRequired[str | None]
    metadata: NotRequired[dict[str, JsonValue] | None]


class AmountPayoutRequest(_CreatePayoutCommon):
    """Same-currency payout; ``amount`` is in the destination currency."""

    amount: str


class QuotedPayoutRequest(_CreatePayoutCommon):
    """Cross-currency payout using a quote from ``payout_quotes.create``."""

    quote_id: str


# Supply exactly one of amount or quote_id.
CreatePayoutRequest = Union[AmountPayoutRequest, QuotedPayoutRequest]


class PayoutResponse(TypedDict):
    id: str
    status: str
    amount: str
    currency: str
    source_currency: NotRequired[str | None]
    fee: NotRequired[str | None]
    total_debited: NotRequired[str | None]
    destination: NotRequired[str | None]
    reference: NotRequired[str | None]
    failure_reason: NotRequired[str | None]
    created_at: NotRequired[str | None]
    completed_at: NotRequired[str | None]


class PayoutListParams(TypedDict, total=False):
    limit: int
    offset: int
    status_filter: Literal["requested", "pending", "processing", "approved", "rejected", "completed", "failed"]


class PayoutListResponse(TypedDict):
    total: int
    items: list[PayoutResponse]


# Webhooks


class WebhookEvent(TypedDict):
    id: str
    type: str
    created_at: str
    organization_id: str
    data: dict[str, Any]
