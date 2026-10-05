import { createHmac, timingSafeEqual } from 'node:crypto';
import { BachsConfigError, BachsWebhookError } from './errors.js';
import type { WebhookEvent, WebhookHeaders, WebhookOptions } from './v1-types.js';
import { record } from './v1-responses.js';

function header(headers: WebhookHeaders, name: string): string | undefined {
  if (headers instanceof Headers) return headers.get(name) ?? undefined;
  const entries = Object.entries(headers).filter(([key]) => key.toLowerCase() === name.toLowerCase());
  if (entries.length > 1) throw new BachsWebhookError('Duplicate webhook header.');
  const value = entries[0]?.[1];
  if (Array.isArray(value)) {
    if (value.length !== 1) throw new BachsWebhookError('Duplicate webhook header.');
    if (typeof value[0] !== 'string') throw new BachsWebhookError('Webhook header must be a string.');
    return value[0];
  }
  if (value !== undefined && typeof value !== 'string') throw new BachsWebhookError('Webhook header must be a string.');
  return value;
}
function event(value: unknown): value is WebhookEvent {
  return record(value) && ['id', 'type', 'created_at', 'organization_id'].every(key => typeof value[key] === 'string' && value[key] !== '') && record(value.data);
}

/** Verify the exact received bytes before parsing JSON. Persistence/deduplication belongs to the caller. */
export function constructEvent(rawBody: string | Uint8Array, headers: WebhookHeaders, secret: string, options: WebhookOptions = {}): WebhookEvent {
  if (typeof secret !== 'string' || secret === '') throw new BachsConfigError('A webhook signing secret is required.');
  if (typeof rawBody !== 'string' && !(rawBody instanceof Uint8Array)) throw new BachsConfigError('Webhook body must be raw text or bytes, before JSON parsing.');
  if (!(headers instanceof Headers) && !record(headers)) throw new BachsConfigError('Webhook headers must be a Headers object or header record.');
  const tolerance = options.toleranceSeconds ?? 300;
  if (!Number.isFinite(tolerance) || tolerance < 0) throw new BachsConfigError('toleranceSeconds must be a non-negative finite number.');
  const bytes = typeof rawBody === 'string' ? Buffer.from(rawBody, 'utf8') : Buffer.from(rawBody);
  const v2 = header(headers, 'X-Bachs-Signature-V2');
  let timestamp: string | undefined;
  let signatures: string[];
  if (v2 !== undefined) {
    const fields = v2.split(',').map(part => part.trim());
    const timestamps = fields.filter(part => part.startsWith('t='));
    if (timestamps.length !== 1) throw new BachsWebhookError('Webhook signature must contain one timestamp.');
    timestamp = timestamps[0]?.slice(2);
    signatures = fields.filter(part => part.startsWith('v1=')).map(part => part.slice(3));
  } else {
    timestamp = header(headers, 'X-Bachs-Timestamp');
    const signature = header(headers, 'X-Bachs-Signature');
    signatures = signature === undefined ? [] : [signature];
  }
  // Reject malformed V2 rather than falling back to a legacy header.
  if (timestamp === undefined || !/^\d+$/.test(timestamp) || !Number.isSafeInteger(Number(timestamp))) throw new BachsWebhookError('Webhook timestamp is missing or invalid.');
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > tolerance) throw new BachsWebhookError('Webhook timestamp is outside the permitted tolerance.');
  const expected = createHmac('sha256', secret).update(timestamp + '.', 'utf8').update(bytes).digest();
  const verified = signatures.some(signature => /^[a-fA-F0-9]{64}$/.test(signature) && timingSafeEqual(expected, Buffer.from(signature, 'hex')));
  if (!verified) throw new BachsWebhookError('Webhook signature does not match.');
  let parsed: unknown;
  try { parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch (cause) { throw new BachsWebhookError('Verified webhook body is not valid UTF-8 JSON.', cause); }
  if (!event(parsed)) throw new BachsWebhookError('Verified webhook body is not a supported event envelope.');
  return parsed;
}

// Available without creating an API client, for webhook-only handlers.
export const webhooks = Object.freeze({ constructEvent });
