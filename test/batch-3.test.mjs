import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { Bachs, BachsAbortError, BachsApiError, BachsConfigError, BachsNetworkError, BachsResponseError, BachsTimeoutError } from '../dist/esm/index.js';

const KEY = 'synthetic-key-only-for-local-tests';
const product = (extra = {}) => ({ id: 'prod_example', name: 'Pro Plan', price: { currency: 'USD', price_type: 'fixed', amount: '12.00', currency_options: [] }, metadata: null, media: [], future_field: { preserved: true }, ...extra });
const client = (extra = {}) => new Bachs({ apiKey: KEY, environment: 'sandbox', ...extra });
const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
const turn = () => new Promise(resolve => setImmediate(resolve));
const observe = promise => promise.then(value => ({ value }), error => ({ error }));
function respond(res, body, status = 200) { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); }
async function withServer(handler, run) {
  const records = [];
  const server = createServer(async (req, res) => {
    try {
      const chunks = []; for await (const chunk of req) chunks.push(chunk);
      const record = { method: req.method, url: req.url, headers: req.headers, body: Buffer.concat(chunks).toString('utf8') };
      records.push(record); await handler(record, res);
    } catch { if (!res.headersSent) res.writeHead(500); res.end(); }
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  try { await run('http://127.0.0.1:' + address.port, records); }
  finally { server.closeAllConnections(); await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
}

test('21 — credentials, explicit environment and redirect safety', async t => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => { calls.push({ url: String(url), init }); return json(product()); });
  for (const options of [{ apiKey: undefined }, { apiKey: '' }, { apiKey: 'key\r\nInjected: value' }, { timeoutMs: 0 }, { timeoutMs: 2147483648 }, { maxRetries: -1 }, { baseURL: 'http://example.com' }, { baseURL: 'https://user:password@example.com' }]) assert.throws(() => client(options), BachsConfigError);
  assert.throws(() => new Bachs({ apiKey: KEY }), BachsConfigError); assert.equal(calls.length, 0);
  const sandbox = client(); await sandbox.products.get('prod_example');
  await client({ environment: 'production' }).products.get('prod_example');
  assert.equal(calls[0].url, 'https://sandbox-api.bachs.io/v1/products/prod_example');
  assert.equal(calls[1].url, 'https://api.bachs.io/v1/products/prod_example');
  assert.equal(calls[0].init.headers.get('authorization'), 'Bearer ' + KEY);
  assert.equal(calls[0].init.headers.get('idempotency-key'), null);
  assert.ok(!JSON.stringify(sandbox).includes(KEY)); t.mock.restoreAll();
  await withServer((_record, res) => { res.writeHead(302, { location: '/other' }); res.end('redirect'); }, async (baseURL, records) => {
    await assert.rejects(client({ baseURL }).products.get('prod_example'), error => error instanceof BachsApiError && error.status === 302);
    assert.equal(records.length, 1, 'Must not follow a redirect with the credential.');
  });
});

test('22 — creation preserves amounts, omission/null, keys and caller input', async () => {
  await withServer((record, res) => {
    const input = JSON.parse(record.body);
    respond(res, product({ name: input.name, price: { ...input.price, price_type: input.price.price_type ?? 'fixed', amount: input.price.amount ?? '0.00' } }), 201);
  }, async (baseURL, records) => {
    const sdk = client({ baseURL });
    const fixed = Object.freeze({ name: 'Pro Plan', price: Object.freeze({ currency: 'USD', amount: '12.00', currency_options: [{ currency: 'NGN', amount: '12000.00' }] }) });
    const result = await sdk.products.create(fixed, { idempotencyKey: 'catalog-pro-plan' });
    const free = { name: 'Free Plan', price: { currency: 'USD', price_type: 'free', amount: null } };
    const custom = { name: 'Donation', price: { currency: 'USD', price_type: 'custom', preset_amount: '12.00', minimum_amount: null } };
    await sdk.products.create(free); await sdk.products.create(custom);
    assert.equal(records.length, 3); assert.ok(records.every(item => item.method === 'POST' && item.url === '/v1/products'));
    assert.deepEqual(JSON.parse(records[0].body), fixed); assert.deepEqual(JSON.parse(records[1].body), free); assert.deepEqual(JSON.parse(records[2].body), custom);
    assert.equal(JSON.parse(records[0].body).price.price_type, undefined);
    assert.equal(records[0].headers['idempotency-key'], 'catalog-pro-plan'); assert.equal(records[1].headers['idempotency-key'], undefined);
    assert.equal(result.price.amount, '12.00'); assert.deepEqual(result.future_field, { preserved: true });
  });
});

test('23 — retrieval keeps an identifier inside one path segment', async () => {
  await withServer((_record, res) => respond(res, product()), async (baseURL, records) => {
    const sdk = client({ baseURL }); await sdk.products.get('prod/a ?#');
    assert.equal(records[0].url, '/v1/products/prod%2Fa%20%3F%23'); assert.equal(records[0].method, 'GET');
    assert.equal(records[0].body, ''); assert.equal(records[0].headers['content-type'], undefined);
    assert.throws(() => sdk.products.get(''), BachsConfigError); assert.equal(records.length, 1);
  });
});

test('24 — listing preserves filters, envelope and explicit pagination', async () => {
  const page = { items: [product()], pagination: { next_cursor: 'next+ /?', prev_cursor: null, has_more: true, limit: 2 }, future_envelope: true };
  await withServer((_record, res) => respond(res, page), async (baseURL, records) => {
    const sdk = client({ baseURL }); const result = await sdk.products.list({ limit: 2, cursor: 'cursor+ /?', include_archived: false });
    const url = new URL(records[0].url, baseURL);
    assert.equal(url.searchParams.get('cursor'), 'cursor+ /?'); assert.equal(url.searchParams.get('limit'), '2'); assert.equal(url.searchParams.get('include_archived'), 'false');
    assert.deepEqual(result, page); assert.equal(records.length, 1, 'has_more must not cause hidden pagination.');
    await sdk.products.list(); assert.equal(records[1].url, '/v1/products');
  });
});

test('25 — HTTP errors preserve details; unusable successful responses stay distinct', async t => {
  const body = { detail: 'price: amount is required', error_code: 'FUTURE_PROVIDER_CODE', errors: [{ field: 'price.amount', message: 'required', type: 'missing' }], doc_url: 'https://docs.bachs.io/errors', future_detail: { preserved: true } };
  let response = () => json(body, 400, { 'x-request-id': 'request-test', 'retry-after': '5' }); let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; return response(); });
  await assert.rejects(client().products.get('prod_example'), error => {
    assert.ok(error instanceof BachsApiError); assert.equal(error.status, 400); assert.equal(error.errorCode, 'FUTURE_PROVIDER_CODE');
    assert.equal(error.message, body.detail); assert.deepEqual(error.body, body); assert.deepEqual(error.fieldErrors, body.errors);
    assert.equal(error.requestId, 'request-test'); assert.equal(error.retryAfter, '5'); return true;
  }); assert.equal(calls, 1);
  response = () => json({ detail: 'Not found', error_code: 'NOT_FOUND' }, 404);
  await assert.rejects(client().products.get('prod_missing'), error => error instanceof BachsApiError && error.fieldErrors === undefined);
  response = () => new Response('<html>upstream</html>', { status: 502 });
  await assert.rejects(client({ maxRetries: 0 }).products.get('prod_example'), error => error instanceof BachsApiError && error.body === '<html>upstream</html>');
  response = () => new Response('not json', { status: 200 }); const before = calls;
  await assert.rejects(client().products.get('prod_example'), error => error instanceof BachsResponseError && error.status === 200 && error.cause instanceof Error); assert.equal(calls, before + 1);
  response = () => json({ id: 'prod_example', name: 'Missing price' }); await assert.rejects(client().products.get('prod_example'), BachsResponseError);
  response = () => json({ items: [product({ price: { currency: 'USD', amount: 1200, price_type: 'fixed' } })], pagination: {} }); await assert.rejects(client().products.list(), BachsResponseError);
});

test('26 — a connection failure preserves cause without inventing HTTP status', async t => {
  const cause = new TypeError('Simulated connection failure', { cause: Object.assign(new Error('DNS failed'), { code: 'ENOTFOUND' }) }); let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; throw cause; });
  await assert.rejects(client({ maxRetries: 0 }).products.get('prod_example'), error => {
    assert.ok(error instanceof BachsNetworkError); assert.ok(!(error instanceof BachsApiError)); assert.equal(error.cause, cause); assert.equal(error.responseStatus, undefined); assert.equal(error.outcomeUnknown, false); return true;
  }); assert.equal(calls, 1);
});

test('27 — deadline aborts waiting for headers and reading the response body', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); let phase = 'headers'; let signal;
  t.mock.method(globalThis, 'fetch', async (_url, init) => {
    signal = init.signal;
    const pending = () => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }));
    return phase === 'headers' ? pending() : { status: 200, ok: true, headers: new Headers(), text: pending };
  });
  let result = observe(client({ timeoutMs: 40 }).products.get('prod_example')); await turn();
  t.mock.timers.tick(39); assert.equal(signal.aborted, false); t.mock.timers.tick(1);
  assert.ok((await result).error instanceof BachsTimeoutError); assert.equal(signal.aborted, true);
  phase = 'body'; result = observe(client({ timeoutMs: 1000 }).products.get('prod_example', { timeoutMs: 20 })); await turn(); t.mock.timers.tick(20);
  const error = (await result).error; assert.ok(error instanceof BachsTimeoutError); assert.equal(error.responseStatus, 200); assert.equal(error.outcomeUnknown, false);
});

test('28 — caller cancellation prevents sends and interrupts retry waits', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); t.mock.method(Math, 'random', () => 0.5); let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; return json({ detail: 'temporarily unavailable' }, 503); });
  const before = new AbortController(); const reason = new Error('Caller stopped work'); before.abort(reason);
  await assert.rejects(client().products.get('prod_example', { signal: before.signal }), error => error instanceof BachsAbortError && !error.outcomeUnknown && error.cause === reason); assert.equal(calls, 0);
  const during = new AbortController(); const result = observe(client().products.get('prod_example', { signal: during.signal })); await turn(); assert.equal(calls, 1);
  during.abort(reason); assert.ok((await result).error instanceof BachsAbortError); t.mock.timers.tick(5000); await turn(); assert.equal(calls, 1);
});

test('29 — reads recover, exhaust their limit and respect server hints/deadline', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); t.mock.method(Math, 'random', () => 0.5); let queue = []; let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; const next = queue.shift(); assert.ok(next, 'Unexpected extra attempt'); if (next instanceof Error) throw next; return next; });
  queue = [json({ detail: 'busy' }, 429, { 'retry-after': '1' }), json({ detail: 'busy' }, 503), json(product())];
  let result = observe(client().products.get('prod_example')); await turn(); assert.equal(calls, 1);
  t.mock.timers.tick(999); await turn(); assert.equal(calls, 1); t.mock.timers.tick(1); await turn(); assert.equal(calls, 2);
  t.mock.timers.tick(999); await turn(); assert.equal(calls, 2); t.mock.timers.tick(1); await turn(); assert.equal((await result).value.id, 'prod_example'); assert.equal(calls, 3);
  calls = 0; queue = [new TypeError('connection lost'), json(product())]; result = observe(client().products.get('prod_example')); await turn(); t.mock.timers.tick(500); await turn(); assert.equal((await result).value.id, 'prod_example'); assert.equal(calls, 2);
  calls = 0; queue = [json({ detail: 'busy' }, 500), json({ detail: 'busy' }, 502), json({ detail: 'still busy' }, 503)]; result = observe(client().products.get('prod_example')); await turn(); t.mock.timers.tick(500); await turn(); t.mock.timers.tick(1000); await turn(); assert.ok((await result).error instanceof BachsApiError); assert.equal(calls, 3);
  for (const status of [400, 401, 403, 404, 409, 501]) { calls = 0; queue = [json({ detail: 'do not retry' }, status)]; const stopped = await observe(client().products.get('prod_example')); assert.equal(stopped.error.status, status); assert.equal(calls, 1); }
  calls = 0; queue = [json({ detail: 'wait longer' }, 429, { 'retry-after': '10' })]; const long = await observe(client({ timeoutMs: 1000 }).products.get('prod_example')); assert.ok(long.error instanceof BachsApiError); assert.equal(calls, 1);
  calls = 0; queue = [json({ detail: 'no retry requested' }, 503)]; await assert.rejects(client().products.get('prod_example', { maxRetries: 0 }), BachsApiError); assert.equal(calls, 1);
});

test('30 — writes send once, preserve keys and expose uncertain outcomes', async t => {
  const input = { name: 'Pro Plan', price: { currency: 'USD', amount: '12.00' } };
  await withServer((_record, res) => respond(res, { detail: 'server failure', error_code: 'INTERNAL_SERVER_ERROR' }, 500), async (baseURL, records) => {
    await assert.rejects(client({ baseURL, maxRetries: 5 }).products.create(input, { idempotencyKey: 'catalog-pro-plan' }), error => error instanceof BachsApiError && error.status === 500 && error.outcomeUnknown);
    assert.equal(records.length, 1); assert.equal(records[0].headers['idempotency-key'], 'catalog-pro-plan'); assert.deepEqual(JSON.parse(records[0].body), input);
  });
  t.mock.timers.enable({ apis: ['setTimeout'] }); let calls = 0; const cause = new TypeError('Response lost');
  t.mock.method(globalThis, 'fetch', async (_url, init) => { calls++; assert.equal(init.headers.get('idempotency-key'), 'catalog-pro-plan'); throw cause; });
  await assert.rejects(client({ maxRetries: 5 }).products.create(input, { idempotencyKey: 'catalog-pro-plan' }), error => error instanceof BachsNetworkError && error.outcomeUnknown && error.cause === cause);
  t.mock.timers.tick(10000); await turn(); assert.equal(calls, 1);
  await assert.rejects(client().products.create(input, { idempotencyKey: ' bad key ' }), BachsConfigError); assert.equal(calls, 1);
});
