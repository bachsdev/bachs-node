import test from 'node:test';
import assert from 'node:assert/strict';
import { Bachs } from '../dist/esm/index.js';

const created = { checkout_id: 'chk_synthetic', checkout_url: 'https://checkout.example.com/synthetic', status: 'open', expires_at: '2026-10-03T13:00:00Z', created_at: '2026-10-03T12:00:00Z', reference: null };
const payment = { payment_id: 'pay_synthetic', status: 'succeeded', amount: '12.00', currency: 'USD', created_at: '2026-10-03T12:00:00Z', updated_at: '2026-10-03T12:01:00Z' };
const pagination = { has_more: false, limit: 1, offset: 0, returned: 1, total: 1, next_cursor: null, prev_cursor: null };
const subscription = { id: 'sub_synthetic', status: 'active', amount: '12.00', currency: 'USD', customer: { customer_id: 'cust_synthetic', email: 'synthetic@example.com' }, billing_cycle: { interval: 'month', frequency: 1 }, cancel_at_period_end: false, items: [{ id: 'si_synthetic', quantity: 1, recurring: true, unit_amount: '12.00' }] };
const destination = { id: 'pd_synthetic', name: 'Synthetic destination', type: 'bank_account', currency: 'NGN', status: 'pending_review', is_usable: false, account_number: null };
const quote = { quote_id: 'pqt_synthetic', from_currency: 'USD', to_currency: 'NGN', from_amount: '1.00', to_amount: '1400.00', exchange_rate: '1400.00', expires_at: '2026-10-03T12:01:00Z' };
const payout = { id: 'pay_synthetic_payout', status: 'pending', amount: '1400.00', currency: 'NGN', source_currency: 'USD', fee: '0.10', total_debited: '1.10', destination: 'pd_synthetic' };
function harness(t, responses) {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    const next = responses.shift(); assert.ok(next !== undefined, 'Unexpected extra HTTP call');
    calls.push({ url: new URL(url), method: init.method, headers: Object.fromEntries(init.headers), body: init.body === undefined ? undefined : JSON.parse(init.body) });
    assert.equal(init.headers.get('authorization'), 'Bearer synthetic-key');
    return new Response(JSON.stringify(next), { status: 200, headers: { 'content-type': 'application/json' } });
  });
  return { calls, sdk: new Bachs({ apiKey: 'synthetic-key', environment: 'sandbox', maxRetries: 0 }) };
}

test('31 — recurring product checkout preserves catalog/customer inputs and operation key', async t => {
  const { sdk, calls } = harness(t, [{ ...created, future_field: true }]);
  const input = Object.freeze({ product_cart: [{ product_id: 'prod_synthetic', quantity: 1 }], customer: { email: 'synthetic@example.com', name: 'Synthetic Customer' }, metadata: { order: 'synthetic-order' } });
  const result = await sdk.checkoutSessions.create(input, { idempotencyKey: 'synthetic-checkout-001' });
  assert.equal(calls[0].method, 'POST'); assert.equal(calls[0].url.pathname, '/v1/checkout-sessions'); assert.deepEqual(calls[0].body, input); assert.ok(!('success_url' in calls[0].body));
  assert.equal(calls[0].headers['idempotency-key'], 'synthetic-checkout-001'); assert.equal(result.future_field, true); assert.equal(result.checkout_id, created.checkout_id);
});
test('32 — raw checkout and retrieval preserve pricing, nullable payment and encoded ID', async t => {
  const { sdk, calls } = harness(t, [created, { checkout_id: 'chk/a', status: 'open', amount: '12.00', currency: 'USD', charge: null, customer: null, customer_details: null }, { checkout_id: 'chk_paid', status: 'completed', charge: payment }]);
  await sdk.checkoutSessions.create({ pricing: { currency: 'USD', amount: '12.00' }, success_url: 'https://example.com/success', cancel_url: null, customer_creation: 'always', payment_method_types: ['USD_CARD'] });
  assert.equal(calls[0].body.pricing.amount, '12.00'); assert.equal(calls[0].body.cancel_url, null); assert.equal(calls[0].body.customer_creation, 'always');
  const open = await sdk.checkoutSessions.get('chk/a'); assert.equal(open.charge, null); assert.equal(calls[1].url.pathname, '/v1/checkout-sessions/chk%2Fa'); assert.equal(calls[1].body, undefined);
  assert.equal((await sdk.checkoutSessions.get('chk_paid')).charge.payment_id, payment.payment_id);
});
test('33 — payment retrieval and list keep distinct documented identifiers and paging', async t => {
  const item = { id: payment.payment_id, status: 'succeeded', amount: '12.00', currency: 'USD', customer_name: 'Synthetic', customer_email: 'synthetic@example.com', substatus: 'future_detail' };
  const { sdk, calls } = harness(t, [payment, { items: [item], pagination }]);
  assert.deepEqual(await sdk.payments.get('pay_synthetic'), payment);
  const page = await sdk.payments.list({ limit: 1, offset: 0, status_filter: 'succeeded' });
  assert.equal(calls[0].url.pathname, '/v1/payments/pay_synthetic'); assert.equal(calls[1].url.searchParams.get('offset'), '0'); assert.equal(calls[1].url.searchParams.get('status_filter'), 'succeeded');
  assert.equal(page.items[0].id, payment.payment_id); assert.ok(!('payment_id' in page.items[0])); assert.equal(page.items[0].substatus, 'future_detail'); assert.deepEqual(page.pagination, pagination); assert.equal(calls.length, 2);
});
test('34 — subscription retrieval/list support merchant customer lookup without new subscriptions', async t => {
  const { sdk, calls } = harness(t, [subscription, { items: [subscription], pagination }]);
  const single = await sdk.subscriptions.get('sub_synthetic'); assert.equal(single.customer.customer_id, 'cust_synthetic'); assert.equal(single.items[0].unit_amount, '12.00');
  const page = await sdk.subscriptions.list({ customer_id: 'cust_synthetic', status: 'active', limit: 1, offset: 0 });
  assert.equal(calls[1].method, 'GET'); assert.equal(calls[1].url.searchParams.get('customer_id'), 'cust_synthetic'); assert.equal(page.items.length, 1); assert.equal(calls.length, 2);
});
test('35 — immediate cancellation uses DELETE with explicit false/reason and a supplied key', async t => {
  const canceled = { ...subscription, status: 'canceled', next_billed_at: null, canceled_at: '2026-10-03T12:00:00Z' };
  const { sdk, calls } = harness(t, [canceled]);
  const result = await sdk.subscriptions.cancel('sub_synthetic', { cancel_at_period_end: false, reason: 'Synthetic cancellation' }, { idempotencyKey: 'synthetic-cancel' });
  assert.equal(calls[0].method, 'DELETE'); assert.equal(calls[0].url.pathname, '/v1/subscriptions/sub_synthetic'); assert.equal(calls[0].body.cancel_at_period_end, false); assert.equal(calls[0].headers['idempotency-key'], 'synthetic-cancel'); assert.equal(result.status, 'canceled'); assert.equal(result.next_billed_at, null);
});
test('36 — period-end cancellation returns active/scheduled rather than inventing final cancellation', async t => {
  const { sdk, calls } = harness(t, [{ ...subscription, cancel_at_period_end: true }, { ...subscription, status: 'canceled' }]);
  const result = await sdk.subscriptions.cancel('sub_synthetic', { cancel_at_period_end: true });
  assert.equal(result.status, 'active'); assert.equal(result.cancel_at_period_end, true); assert.equal(calls[0].body.cancel_at_period_end, true);
  await sdk.subscriptions.cancel('sub_synthetic'); assert.deepEqual(calls[1].body, {});
});
test('37 — hosted portal issues one customer-scoped session with no invented request fields', async t => {
  const { sdk, calls } = harness(t, [{ id: 'psn_synthetic', url: 'https://portal.example.com/s/synthetic-credential' }]);
  const result = await sdk.customerPortal.createSession('cust/a');
  assert.equal(calls[0].url.pathname, '/v1/customers/cust%2Fa/portal-sessions'); assert.equal(calls[0].method, 'POST'); assert.equal(calls[0].body, undefined); assert.ok(!('content-type' in calls[0].headers)); assert.equal(result.id, 'psn_synthetic');
});
test('38 — balances/bank lookup keep decimal strings, codes and unresolved-account outcome', async t => {
  const balances = { account_id: 'acct_synthetic', total_balance_usd: '123.45', balances: [{ currency: 'USD', available_balance: '123.45', pending_balance: '0.00', held_for_disputes: '0.00' }] };
  const unresolved = { resolved: false, account_name: null, account_number: null, message: 'Synthetic unsupported bank' };
  const { sdk, calls } = harness(t, [balances, { country: 'NG', banks: [{ name: 'Synthetic Bank', code: '001' }] }, unresolved]);
  assert.deepEqual(await sdk.balances.get(), balances); assert.equal((await sdk.banks.list({ country: 'NG' })).banks[0].code, '001');
  const result = await sdk.banks.resolveAccount({ account_number: '0000000000', bank_code: '001', country: 'NG' });
  assert.equal(result.resolved, false); assert.equal(result.account_name, null); assert.equal(calls[1].url.pathname, '/v1/reference/banks'); assert.equal(calls[2].method, 'POST'); assert.equal(calls[2].url.pathname, '/v1/misc/bank-accounts/resolve'); assert.equal(calls[2].body.account_number, '0000000000');
});
test('39 — destination review/usability come from Bachs and list envelope is preserved', async t => {
  const approved = { ...destination, status: 'approved', is_usable: true };
  const { sdk, calls } = harness(t, [destination, approved, { destinations: [approved], total: 1, limit: 20, offset: 0 }]);
  const pending = await sdk.payoutDestinations.create({ currency: 'NGN', account_number: '0000000000', bank_code: '001', label: 'Synthetic' });
  assert.equal(pending.is_usable, false); assert.equal((await sdk.payoutDestinations.get('pd_synthetic')).is_usable, true);
  const page = await sdk.payoutDestinations.list({ status: 'approved', currency: 'NGN', offset: 0 });
  assert.equal(page.destinations[0].status, 'approved'); assert.ok(!('items' in page)); assert.equal(calls[2].url.searchParams.get('status'), 'approved'); assert.equal(calls[0].body.label, 'Synthetic'); assert.equal(calls.length, 3);
});
test('40 — cross-currency quote and payout preserve both currencies and expose status/history', async t => {
  const { sdk, calls } = harness(t, [quote, payout, payout, { items: [payout], total: 1 }, { ...payout, amount: '100.00', currency: 'NGN', source_currency: 'NGN' }]);
  const quoted = await sdk.payoutQuotes.create({ from_currency: 'USD', to_currency: 'NGN', amount: '1.00' });
  const createdPayout = await sdk.payouts.create({ destination: 'pd_synthetic', quote_id: quoted.quote_id, reference: 'synthetic' }, { idempotencyKey: 'synthetic-payout' });
  assert.equal(createdPayout.status, 'pending'); assert.equal(createdPayout.currency, 'NGN'); assert.equal(createdPayout.source_currency, 'USD'); assert.equal(createdPayout.total_debited, '1.10'); assert.ok(!('amount' in calls[1].body));
  assert.equal((await sdk.payouts.get(createdPayout.id)).id, createdPayout.id);
  assert.equal((await sdk.payouts.list({ offset: 0, status_filter: 'pending' })).total, 1); assert.equal(calls[3].url.searchParams.get('status_filter'), 'pending');
  await sdk.payouts.create({ destination: 'pd_synthetic', amount: '100.00' }); assert.ok(!('quote_id' in calls[4].body)); assert.equal(calls.length, 5);
});
