import test from 'node:test';
import assert from 'node:assert/strict';
import { Bachs, BachsConfigError, BachsResponseError } from '../dist/esm/index.js';
const client = () => new Bachs({ apiKey: 'synthetic-key', environment: 'sandbox' });
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
const endpoint = { endpoint_id: 'we_synthetic', name: 'Synthetic', url: 'https://example.com/hooks', enabled: false, disabled_at: '2026-10-17T10:00:00Z', disabled_reason: 'consecutive_failures', event_types: ['collection.succeeded'], event_source: 'account', created_at: '2026-10-01T10:00:00Z', updated_at: '2026-10-17T10:00:00Z' };
const summary = { event_id: 'evt_synthetic', event_type: 'collection.succeeded', entity_id: 'pay_synthetic', attempts: 3, success: 0, failed: 3, last_attempt_status: 'failed', last_attempt_http_status: 500, last_attempt_error: 'HTTP 500', last_attempt_at: '2026-10-17T10:00:00Z' };
const attempt = { attempt_id: 'wa_synthetic', attempt_no: 1, status: 'failed', endpoint_id: 'we_synthetic', delivery_id: 'wd_synthetic', callback_url: 'https://example.com/hooks', http_status: 500, response_snippet: 'Internal Server Error', last_error: null, next_retry_at: '2026-10-17T10:05:00Z', created_at: '2026-10-17T10:00:00Z', updated_at: '2026-10-17T10:00:00Z' };
const detail = { event_id: 'evt_synthetic', event_type: 'collection.succeeded', entity_type: 'charge', entity_id: 'pay_synthetic', created_at: '2026-10-17T10:00:00Z', payload: { id: 'evt_synthetic' }, attempts: [attempt] };

test('51 — webhook endpoint reads use the documented paths and query parameters', async t => {
  const seen = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    seen.push([init.method, String(url)]);
    const path = new URL(url).pathname;
    if (path.endsWith('/events')) return json({ items: [summary], total: 1, limit: 10, offset: 0 });
    if (path.endsWith('/endpoints')) return json({ items: [endpoint], pagination: { next_cursor: null, prev_cursor: null, has_more: false, limit: 50, offset: 0, returned: 1, total: 1 } });
    return json(endpoint);
  });
  const sdk = client();
  assert.equal((await sdk.webhookEndpoints.list({ limit: 50 })).items[0].disabled_reason, 'consecutive_failures');
  assert.equal((await sdk.webhookEndpoints.get('we/synthetic')).endpoint_id, 'we_synthetic');
  assert.equal((await sdk.webhookEndpoints.listEvents('we_synthetic', { limit: 10, offset: 0 })).items[0].last_attempt_http_status, 500);
  assert.deepEqual(seen.map(([method, url]) => [method, new URL(url).pathname + new URL(url).search]), [
    ['GET', '/v1/webhooks/endpoints?limit=50'], ['GET', '/v1/webhooks/endpoints/we%2Fsynthetic'], ['GET', '/v1/webhooks/endpoints/we_synthetic/events?limit=10&offset=0']
  ]);
});
test('52 — webhook event reads return delivery attempts, including the receiving server answer', async t => {
  t.mock.method(globalThis, 'fetch', async url => new URL(url).pathname === '/v1/webhooks/events'
    ? json({ items: [{ ...summary, entity_type: 'charge', created_at: '2026-10-17T10:00:00Z', account: null }], total: 1, limit: 50, offset: 0 })
    : json(detail));
  const sdk = client();
  assert.equal((await sdk.webhookEvents.list()).items[0].failed, 3);
  const event = await sdk.webhookEvents.get('evt_synthetic');
  assert.equal(event.attempts[0].response_snippet, 'Internal Server Error'); assert.equal(event.attempts[0].next_retry_at, '2026-10-17T10:05:00Z');
});
test('53 — webhook reads reject empty IDs before sending and unsupported shapes after', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; return json({ ...detail, attempts: [{ ...attempt, attempt_no: '1' }] }); });
  const sdk = client();
  assert.throws(() => sdk.webhookEndpoints.get(''), BachsConfigError); assert.throws(() => sdk.webhookEndpoints.listEvents(' '), BachsConfigError); assert.throws(() => sdk.webhookEvents.get(''), BachsConfigError);
  assert.equal(calls, 0);
  await assert.rejects(sdk.webhookEvents.get('evt_synthetic'), BachsResponseError); assert.equal(calls, 1);
});
test('54 — webhook resources are read-only', () => {
  const sdk = client();
  for (const name of ['create', 'update', 'delete', 'resend', 'replay', 'rotateSecret', 'getSecret']) { assert.equal(sdk.webhookEndpoints[name], undefined, name); assert.equal(sdk.webhookEvents[name], undefined, name); }
});
