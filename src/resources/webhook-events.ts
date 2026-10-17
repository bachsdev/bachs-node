import { Transport } from '../client.js';
import { decodeWebhookEvent, decodeWebhookEvents } from '../v1-responses.js';
import type { ReadRequestOptions } from '../types.js';
import type { WebhookEventListParams } from '../v1-types.js';
import { idPath } from './ids.js';
export class WebhookEvents {
  constructor(private readonly transport: Transport) {}
  get(eventId: string, options: ReadRequestOptions = {}) { return this.transport.request('GET', '/v1/webhooks/events/' + idPath(eventId, 'eventId'), { options }, decodeWebhookEvent); }
  list(filters: WebhookEventListParams = {}, options: ReadRequestOptions = {}) { return this.transport.request('GET', '/v1/webhooks/events', { query: { ...filters }, options }, decodeWebhookEvents); }
}
