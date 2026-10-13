"""Static fixtures, checked by mypy and never run. Each ignore marks an expected error, like @ts-expect-error."""

from bachs import Bachs, webhooks
from bachs.types import CreateCheckoutSessionRequest, CreatePayoutRequest

bachs = Bachs(api_key="synthetic", environment="sandbox")
cart: CreateCheckoutSessionRequest = {
    "product_cart": [{"product_id": "prod_synthetic"}],
    "customer": {"email": "synthetic@example.com", "name": "Synthetic"},
}
raw: CreateCheckoutSessionRequest = {"pricing": {"currency": "USD", "amount": "12.00"}}
same: CreatePayoutRequest = {"destination": "pd_synthetic", "amount": "1.00"}
cross: CreatePayoutRequest = {"destination": "pd_synthetic", "quote_id": "pqt_synthetic"}
bachs.checkout_sessions.create(cart)
bachs.checkout_sessions.create(raw)
bachs.subscriptions.cancel("sub_synthetic", {"cancel_at_period_end": True})
bachs.payouts.create(same)
bachs.payouts.create(cross)
webhooks.construct_event("{}", {}, "synthetic")
# Checkout modes are mutually exclusive.
both: CreateCheckoutSessionRequest = {"product_cart": [], "pricing": {"currency": "USD"}}  # type: ignore[assignment]
# An offering or raw price is required.
empty: CreateCheckoutSessionRequest = {}  # type: ignore[assignment]
# Deprecated return_url is not exposed.
bachs.checkout_sessions.create({"pricing": {"currency": "USD"}, "return_url": "https://example.com"})  # type: ignore[arg-type]
# Connect request fields are outside V1.
bachs.checkout_sessions.create({"pricing": {"currency": "USD"}, "transfer_data": {"destination": "acct_synthetic"}})  # type: ignore[arg-type]
# Money remains a decimal string.
numeric: CreatePayoutRequest = {"destination": "pd_synthetic", "amount": 1}  # type: ignore[typeddict-item]
# Quote and amount cannot both be supplied.
two: CreatePayoutRequest = {"destination": "pd_synthetic", "amount": "1.00", "quote_id": "pqt_synthetic"}  # type: ignore[assignment]
# Payout requires amount or quote.
missing: CreatePayoutRequest = {"destination": "pd_synthetic"}  # type: ignore[assignment]
# Direct charge beta is excluded.
bachs.payments.create({"amount": "1.00"})  # type: ignore[attr-defined]
# Write retry controls are excluded.
bachs.subscriptions.cancel("sub_synthetic", {}, max_retries=2)  # type: ignore[call-arg]
