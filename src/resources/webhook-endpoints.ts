import { Transport } from '../client.js';
import { decodeEndpointEvents, decodeWebhookEndpoint, decodeWebhookEndpoints } from '../v1-responses.js';
import type { ReadRequestOptions } from '../types.js';
import type { WebhookEndpointListParams, WebhookEventListParams } from '../v1-types.js';
import { idPath } from './ids.js';
export class WebhookEndpoints {
  constructor(private readonly transport: Transport) {}
  get(endpointId: string, options: ReadRequestOptions = {}) { return this.transport.request('GET', '/v1/webhooks/endpoints/' + idPath(endpointId, 'endpointId'), { options }, decodeWebhookEndpoint); }
  list(filters: WebhookEndpointListParams = {}, options: ReadRequestOptions = {}) { return this.transport.request('GET', '/v1/webhooks/endpoints', { query: { ...filters }, options }, decodeWebhookEndpoints); }
  listEvents(endpointId: string, filters: WebhookEventListParams = {}, options: ReadRequestOptions = {}) {
    return this.transport.request('GET', '/v1/webhooks/endpoints/' + idPath(endpointId, 'endpointId') + '/events', { query: { ...filters }, options }, decodeEndpointEvents);
  }
}
