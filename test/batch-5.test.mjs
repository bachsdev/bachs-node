import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createRequire } from 'node:module';
import { Bachs, BachsApiError, BachsNetworkError, BachsTimeoutError, BachsAbortError, BachsResponseError, BachsConfigError, BachsWebhookError, webhooks } from '../dist/esm/index.js';
const secret = 'synthetic-signing-secret';
const seconds = 1801569600;
const event = { id: 'evt_synthetic', type: 'payout.paid', created_at: '2026-10-03T12:00:00Z', organization_id: 'acct_synthetic', data: { payout_id: 'pay_synthetic' }, future_field: true };
const raw = JSON.stringify(event);
const signature = (body, timestamp = String(seconds), key = secret) => createHmac('sha256', key).update(timestamp + '.').update(body).digest('hex');
const legacy = (body, timestamp = String(seconds)) => ({ 'X-Bachs-Timestamp': timestamp, 'X-Bachs-Signature': signature(body, timestamp) });
const client = (options = {}) => new Bachs({ apiKey: 'synthetic-key', environment: 'sandbox', ...options });
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
const turn = () => new Promise(resolve => setImmediate(resolve));
const observe = promise => promise.then(value => ({ value }), error => ({ error }));
function clock(t) { t.mock.method(Date, 'now', () => seconds * 1000); }

test('41 — legacy signatures verify exact UTF-8 bytes and preserve the event envelope', t => {
  clock(t); assert.deepEqual(webhooks.constructEvent(raw, legacy(raw), secret), event);
  const unicode = JSON.stringify({ ...event, data: { name: 'Synthetic café' } });
  assert.equal(webhooks.constructEvent(Buffer.from(unicode), new Headers(legacy(unicode)), secret).data.name, 'Synthetic café');
});
test('42 — V2 accepts a matching rotation signature beyond the first and unknown event types', t => {
  clock(t); const future = JSON.stringify({ ...event, type: 'future.event' });
  const header = `t=${seconds},v1=${signature(future, String(seconds), 'previous-synthetic-secret')},v1=${signature(future)}`;
  assert.equal(webhooks.constructEvent(future, { 'x-bachs-signature-v2': header }, secret).type, 'future.event');
  assert.equal(webhooks.constructEvent(future, { 'X-Bachs-Signature-V2': header }, 'previous-synthetic-secret').future_field, true);
});
test('43 — wrong secret, changed body and JSON reserialization fail verification', t => {
  clock(t); assert.throws(() => webhooks.constructEvent(raw, legacy(raw), 'different-secret'), BachsWebhookError);
  assert.throws(() => webhooks.constructEvent(raw.replace('payout.paid', 'payout.failed'), legacy(raw), secret), BachsWebhookError);
  const spaced = JSON.stringify(event, null, 2);
  assert.throws(() => webhooks.constructEvent(raw, legacy(spaced), secret), BachsWebhookError);
  assert.deepEqual(webhooks.constructEvent(spaced, legacy(spaced), secret), event);
});
test('44 — stale/future timestamps are rejected and the tolerance boundary is explicit', t => {
  clock(t);
  for (const timestamp of [String(seconds - 301), String(seconds + 301)]) assert.throws(() => webhooks.constructEvent(raw, legacy(raw, timestamp), secret), BachsWebhookError);
  assert.equal(webhooks.constructEvent(raw, legacy(raw, String(seconds - 300)), secret).id, event.id);
  assert.throws(() => webhooks.constructEvent(raw, legacy(raw, String(seconds - 10)), secret, { toleranceSeconds: 5 }), BachsWebhookError);
  for (const timestamp of ['123abc', '-1', 'NaN', '9007199254740992']) assert.throws(() => webhooks.constructEvent(raw, legacy(raw, timestamp), secret), BachsWebhookError);
});
test('45 — malformed/duplicate signature headers fail without fallback or crypto length errors', t => {
  clock(t);
  for (const headers of [{}, { 'X-Bachs-Timestamp': String(seconds), 'X-Bachs-Signature': 'a' }, { ...legacy(raw), 'X-Bachs-Signature-V2': 'malformed' }, { 'X-Bachs-Signature-V2': `t=${seconds},t=${seconds},v1=${signature(raw)}` }, { 'X-Bachs-Timestamp': [String(seconds), String(seconds)], 'X-Bachs-Signature': signature(raw) }, { ...legacy(raw), 'x-bachs-timestamp': String(seconds) }]) {
    assert.throws(() => webhooks.constructEvent(raw, headers, secret), BachsWebhookError);
  }
});
test('46 — only signed valid JSON/envelopes are returned; parsed bodies and invalid options rejected', t => {
  clock(t);
  for (const value of ['not-json', 'null', '[]', '{}', JSON.stringify({ ...event, data: null }), JSON.stringify({ ...event, id: '' })]) assert.throws(() => webhooks.constructEvent(value, legacy(value), secret), BachsWebhookError);
  const invalidUtf8 = Buffer.from([0xff]); assert.throws(() => webhooks.constructEvent(invalidUtf8, legacy(invalidUtf8), secret), BachsWebhookError);
  assert.throws(() => webhooks.constructEvent(raw, null, secret), BachsConfigError);
  assert.throws(() => webhooks.constructEvent(raw, { 'X-Bachs-Signature-V2': 1 }, secret), BachsWebhookError);
  assert.throws(() => webhooks.constructEvent(raw, { 'X-Bachs-Signature-V2': [1] }, secret), BachsWebhookError);
  assert.throws(() => webhooks.constructEvent(event, legacy(raw), secret), BachsConfigError);
  assert.throws(() => webhooks.constructEvent(raw, legacy(raw), ''), BachsConfigError);
  for (const toleranceSeconds of [-1, NaN, Infinity]) assert.throws(() => webhooks.constructEvent(raw, legacy(raw), secret, { toleranceSeconds }), BachsConfigError);
});
test('47 — all V1 writes send once on temporary HTTP errors and lost responses', async t => {
  let calls = 0; let mode = 'http'; let status = 503;
  t.mock.method(globalThis, 'fetch', async () => { calls++; if (mode === 'network') throw new TypeError('Synthetic response lost'); return json({ detail: 'Synthetic failure', error_code: 'FUTURE_ERROR' }, status); });
  const sdk = client({ maxRetries: 5 });
  const operations = [() => sdk.checkoutSessions.create({ pricing: { currency: 'USD', amount: '12.00' } }), () => sdk.subscriptions.cancel('sub_synthetic'), () => sdk.customerPortal.createSession('cust_synthetic'), () => sdk.banks.resolveAccount({ account_number: '0000000000', bank_code: '001' }), () => sdk.payoutDestinations.create({ currency: 'NGN' }), () => sdk.payoutQuotes.create({ from_currency: 'USD', to_currency: 'NGN', amount: '1.00' }), () => sdk.payouts.create({ destination: 'pd_synthetic', amount: '1.00' }, { idempotencyKey: 'synthetic-operation' })];
  for (const operation of operations) {
    for (status of [429, 503]) { mode = 'http'; calls = 0; await assert.rejects(operation(), error => error instanceof BachsApiError && error.status === status && error.outcomeUnknown === (status >= 500)); assert.equal(calls, 1); }
    mode = 'network'; calls = 0; await assert.rejects(operation(), error => error instanceof BachsNetworkError && error.outcomeUnknown); assert.equal(calls, 1);
  }
});
test('48 — shared retry/deadline/cancellation policy reaches newly added resource methods', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); t.mock.method(Math, 'random', () => 0.5);
  let calls = 0; let pending = false; let signal;
  t.mock.method(globalThis, 'fetch', async (_url, init) => {
    calls++; signal = init.signal;
    if (pending) return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }));
    return calls === 1 ? json({ detail: 'Busy' }, 503) : json({ id: 'pay_synthetic', status: 'pending', amount: '1.00', currency: 'USD' });
  });
  let result = observe(client().payouts.get('pay_synthetic')); await turn(); t.mock.timers.tick(500); await turn(); assert.equal((await result).value.status, 'pending'); assert.equal(calls, 2);
  pending = true; calls = 0; result = observe(client({ timeoutMs: 20 }).payouts.create({ destination: 'pd_synthetic', amount: '1.00' })); await turn(); t.mock.timers.tick(20); const timeout = (await result).error; assert.ok(timeout instanceof BachsTimeoutError); assert.equal(timeout.outcomeUnknown, true); assert.equal(calls, 1);
  calls = 0; const controller = new AbortController(); result = observe(client().subscriptions.cancel('sub_synthetic', {}, { signal: controller.signal })); await turn(); controller.abort(new Error('Synthetic cancellation')); const canceled = (await result).error; assert.ok(canceled instanceof BachsAbortError); assert.equal(canceled.outcomeUnknown, true); assert.equal(calls, 1); assert.equal(signal.aborted, true);
});
test('49 — ambiguous request modes fail before send; unsupported successful responses are not retried', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; return json({ unknown_shape: true }); });
  const sdk = client();
  for (const input of [{ destination: 'pd_synthetic' }, { destination: 'pd_synthetic', amount: '1.00', quote_id: 'pqt_synthetic' }, { destination: 'pd_synthetic', amount: 1 }, { destination: 'pd_synthetic', quote_id: '' }]) assert.throws(() => sdk.payouts.create(input), BachsConfigError);
  for (const input of [{}, { product_cart: [], pricing: { currency: 'USD' } }, { pricing: null }]) assert.throws(() => sdk.checkoutSessions.create(input), BachsConfigError);
  for (const resource of [sdk.checkoutSessions, sdk.payments, sdk.subscriptions, sdk.payoutDestinations, sdk.payouts]) assert.throws(() => resource.get(''), BachsConfigError);
  assert.equal(calls, 0);
  await assert.rejects(sdk.payouts.get('pay_synthetic'), BachsResponseError); assert.equal(calls, 1);
  await assert.rejects(sdk.payouts.create({ destination: 'pd_synthetic', amount: '1.00' }), error => error instanceof BachsResponseError && error.outcomeUnknown); assert.equal(calls, 2);
});
test('50 — both entry points expose the same errors/helpers and only agreed V1 resources', async () => {
  const require = createRequire(import.meta.url); const cjs = require('../dist/cjs/index.js'); const esm = await import('../dist/esm/index.js');
  for (const name of Object.keys(esm)) assert.equal(esm[name], cjs[name], name);
  assert.ok(new cjs.BachsWebhookError('Synthetic') instanceof esm.BachsError);
  const sdk = client(); assert.equal(sdk.webhooks, webhooks); assert.equal(Object.isFrozen(webhooks), true);
  for (const resource of ['products', 'checkoutSessions', 'payments', 'subscriptions', 'customerPortal', 'balances', 'banks', 'payoutDestinations', 'payoutQuotes', 'payouts']) assert.ok(sdk[resource]);
  assert.equal(sdk.connect, undefined); assert.equal(sdk.payments.create, undefined); assert.equal(sdk.subscriptions.create, undefined); assert.ok(!JSON.stringify(sdk).includes('synthetic-key'));
});
