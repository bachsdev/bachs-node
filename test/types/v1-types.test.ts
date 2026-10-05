import { Bachs, webhooks } from '../../src/index.js';
import type { CreateCheckoutSessionRequest, CreatePayoutRequest } from '../../src/index.js';
const bachs = new Bachs({ apiKey: 'synthetic', environment: 'sandbox' });
const cart: CreateCheckoutSessionRequest = { product_cart: [{ product_id: 'prod_synthetic' }], customer: { email: 'synthetic@example.com', name: 'Synthetic' } };
const raw: CreateCheckoutSessionRequest = { pricing: { currency: 'USD', amount: '12.00' } };
const same: CreatePayoutRequest = { destination: 'pd_synthetic', amount: '1.00' };
const cross: CreatePayoutRequest = { destination: 'pd_synthetic', quote_id: 'pqt_synthetic' };
void bachs.checkoutSessions.create(cart);
void bachs.checkoutSessions.create(raw);
void bachs.subscriptions.cancel('sub_synthetic', { cancel_at_period_end: true });
void bachs.payouts.create(same);
void bachs.payouts.create(cross);
void webhooks.constructEvent('{}', {}, 'synthetic');
// @ts-expect-error Checkout modes are mutually exclusive.
const both: CreateCheckoutSessionRequest = { product_cart: [], pricing: { currency: 'USD' } };
// @ts-expect-error An offering or raw price is required.
const empty: CreateCheckoutSessionRequest = {};
// @ts-expect-error Deprecated return_url is not exposed.
void bachs.checkoutSessions.create({ pricing: { currency: 'USD' }, return_url: 'https://example.com' });
// @ts-expect-error Connect request fields are outside V1.
void bachs.checkoutSessions.create({ pricing: { currency: 'USD' }, transfer_data: { destination: 'acct_synthetic' } });
// @ts-expect-error Money remains a decimal string.
const numeric: CreatePayoutRequest = { destination: 'pd_synthetic', amount: 1 };
// @ts-expect-error Quote and amount cannot both be supplied.
const two: CreatePayoutRequest = { destination: 'pd_synthetic', amount: '1.00', quote_id: 'pqt_synthetic' };
// @ts-expect-error Payout requires amount or quote.
const missing: CreatePayoutRequest = { destination: 'pd_synthetic' };
// @ts-expect-error Direct charge beta is excluded.
void bachs.payments.create({ amount: '1.00' });
// @ts-expect-error Write retry controls are excluded.
void bachs.subscriptions.cancel('sub_synthetic', {}, { maxRetries: 2 });
void [both, empty, numeric, two, missing];
