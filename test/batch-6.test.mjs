import test from 'node:test';
import assert from 'node:assert/strict';
import { Bachs, BachsConfigError } from '../dist/esm/index.js';

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers });
const product = i => ({ id: 'prod_' + i, name: 'P' + i, price: { currency: 'USD', price_type: 'fixed', amount: '1.00' } });
const payout = i => ({ id: 'po_' + i, status: 'completed', amount: '1.00', currency: 'USD' });
const destination = i => ({ id: 'pd_' + i, name: 'D', type: 'bank_account', currency: 'NGN', status: 'approved' });
function recorder() {
  const lines = [];
  const logger = Object.fromEntries(['debug', 'info', 'warn', 'error'].map(level => [level, message => lines.push([level, message])]));
  return { lines, logger };
}

test('51 — the environment comes from the key prefix, and a contradiction refuses to start', t => {
  t.mock.method(globalThis, 'fetch', async () => json(product(1)));
  const { lines, logger } = recorder();
  assert.equal(new Bachs({ apiKey: 'sk_sandbox_synthetic', logger }).environment, 'sandbox');
  assert.equal(new Bachs({ apiKey: 'sk_live_synthetic', logger }).environment, 'production');
  assert.equal(new Bachs({ apiKey: 'sk_live_synthetic', environment: 'production', logger }).environment, 'production');
  assert.equal(new Bachs({ apiKey: 'unknown_prefix_key', environment: 'sandbox', logger }).environment, 'sandbox');
  assert.throws(() => new Bachs({ apiKey: 'sk_sandbox_synthetic', environment: 'production', logger }), error => error instanceof BachsConfigError && /sandbox key/.test(error.message) && !error.message.includes('synthetic'));
  assert.throws(() => new Bachs({ apiKey: 'sk_live_synthetic', environment: 'sandbox', logger }), BachsConfigError);
  assert.throws(() => new Bachs({ apiKey: 'unknown_prefix_key', logger }), BachsConfigError);
  assert.throws(() => new Bachs({ apiKey: 'sk_live_synthetic', environment: 'staging', logger }), BachsConfigError);
  assert.deepEqual(lines, [['warn', 'Bachs: the API key prefix is not recognised; using environment "sandbox" as given.']], 'Only the unrecognised prefix warns by default; the environment line is info level.');
  assert.ok(!JSON.stringify(lines).includes('synthetic'), 'Log lines never carry the key.');
});

test('52 — logging goes to the logger at the chosen level, never with the key, and console stays quiet', async t => {
  t.mock.method(globalThis, 'fetch', async () => json(product(1), 200, { 'x-request-id': 'req_synthetic' }));
  const warned = t.mock.method(console, 'warn', () => {}); const errored = t.mock.method(console, 'error', () => {});
  const silent = recorder(); await new Bachs({ apiKey: 'sk_sandbox_synthetic', logger: silent.logger }).products.get('prod_1');
  assert.deepEqual(silent.lines, [], 'At the default level a normal client logs nothing.');
  const info = recorder(); await new Bachs({ apiKey: 'sk_sandbox_synthetic', logger: info.logger, logLevel: 'info' }).products.get('prod_1');
  assert.deepEqual(info.lines, [['info', 'Bachs: using sandbox (sk_sandbox_ key).']]);
  const debug = recorder(); await new Bachs({ apiKey: 'sk_sandbox_synthetic', logger: debug.logger, logLevel: 'debug' }).products.get('prod_1');
  assert.equal(debug.lines.length, 2); assert.match(debug.lines[1][1], /^Bachs: GET \/v1\/products\/prod_1 -> 200 in \d+ ms \(attempt 1, request req_synthetic\)$/);
  assert.ok(!JSON.stringify(debug.lines).includes('synthetic_key') && !JSON.stringify(debug.lines).includes('Bearer'), 'Debug lines carry no credential.');
  const off = recorder(); new Bachs({ apiKey: 'unknown_prefix_key', environment: 'sandbox', logger: off.logger, logLevel: 'off' }); assert.deepEqual(off.lines, []);
  process.env.BACHS_LOG = 'info'; const env = recorder(); new Bachs({ apiKey: 'sk_live_synthetic', logger: env.logger }); delete process.env.BACHS_LOG;
  assert.deepEqual(env.lines, [['info', 'Bachs: using production (sk_live_ key).']], 'BACHS_LOG sets the level without code changes.');
  assert.throws(() => new Bachs({ apiKey: 'sk_sandbox_synthetic', logLevel: 'loud' }), BachsConfigError);
  assert.throws(() => new Bachs({ apiKey: 'sk_sandbox_synthetic', logger: { warn() {} } }), BachsConfigError);
  assert.equal(warned.mock.callCount() + errored.mock.callCount(), 0, 'A client with a logger never writes to the console.');
  new Bachs({ apiKey: 'unknown_prefix_key', environment: 'sandbox' }); assert.equal(warned.mock.callCount(), 1, 'Without a logger, warnings reach console.warn.');
});

test('53 — listAll walks cursor and offset pages lazily and never loops on a server that ignores offset', async t => {
  const calls = []; let ignoreOffset = false;
  t.mock.method(globalThis, 'fetch', async url => {
    const u = new URL(url); calls.push(u.pathname + u.search); const q = u.searchParams; const limit = Number(q.get('limit') ?? 50);
    if (u.pathname === '/v1/products') { const second = q.get('cursor') === 'c2'; return json({ items: [product(second ? 3 : 1), product(second ? 4 : 2)], pagination: { next_cursor: second ? null : 'c2' } }); }
    if (u.pathname === '/v1/payouts') { const offset = ignoreOffset ? 0 : Number(q.get('offset')); const items = Array.from({ length: Math.min(limit, 5 - offset) }, (_, i) => payout(offset + i)); return json({ total: 5, items }); }
    if (u.pathname === '/v1/payouts/destinations') { const offset = Number(q.get('offset')); return json({ destinations: offset === 0 ? [destination(0), destination(1)] : [destination(2)], total: 3, limit, offset }); }
    if (u.pathname === '/v1/subscriptions') return json({ items: [], pagination: { has_more: false } });
    throw new Error('unexpected ' + u.pathname);
  });
  const sdk = new Bachs({ apiKey: 'sk_sandbox_synthetic', maxRetries: 0 });
  const ids = async iterator => { const out = []; for await (const item of iterator) out.push(item.id); return out; };
  assert.deepEqual(await ids(sdk.products.listAll({ limit: 2 })), ['prod_1', 'prod_2', 'prod_3', 'prod_4']);
  assert.deepEqual(calls.splice(0), ['/v1/products?limit=2', '/v1/products?limit=2&cursor=c2']);
  assert.deepEqual(await ids(sdk.payouts.listAll({ limit: 2 })), ['po_0', 'po_1', 'po_2', 'po_3', 'po_4']);
  assert.deepEqual(calls.splice(0), ['/v1/payouts?limit=2&offset=0', '/v1/payouts?limit=2&offset=2', '/v1/payouts?limit=2&offset=4']);
  assert.deepEqual(await ids(sdk.payoutDestinations.listAll({ limit: 2 })), ['pd_0', 'pd_1', 'pd_2'], 'The destinations envelope is handled.');
  assert.deepEqual(await ids(sdk.subscriptions.listAll()), []); assert.equal(calls.splice(0).length, 3);
  for await (const item of sdk.payouts.listAll({ limit: 2 })) { assert.equal(item.id, 'po_0'); break; }
  assert.equal(calls.splice(0).length, 1, 'Stopping early fetches only the first page.');
  ignoreOffset = true; const seen = await ids(sdk.payouts.listAll({ limit: 2 })); ignoreOffset = false;
  assert.equal(seen.length, 6); assert.equal(calls.splice(0).length, 3, 'A server that ignores offset stops at the total instead of looping.');
  assert.throws(() => sdk.payouts.listAll({ offset: 2 }), BachsConfigError); assert.throws(() => sdk.products.listAll({ cursor: 'c2' }), BachsConfigError);
  assert.equal(calls.length, 0);
});
