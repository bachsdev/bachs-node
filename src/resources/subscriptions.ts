import { Transport } from '../client.js';
import { decodeSubscription, decodeSubscriptions } from '../v1-responses.js';
import type { ReadRequestOptions, WriteRequestOptions } from '../types.js';
import type { SubscriptionListParams, CancelSubscriptionRequest, SubscriptionResponse } from '../v1-types.js';
import { idPath } from './ids.js';
import { offsetPages } from './pagination.js';
export class Subscriptions {
  constructor(private readonly transport: Transport) {}
  get(subscriptionId: string, options: ReadRequestOptions = {}) { return this.transport.request('GET', '/v1/subscriptions/' + idPath(subscriptionId, 'subscriptionId'), { options }, decodeSubscription); }
  list(filters: SubscriptionListParams = {}, options: ReadRequestOptions = {}) { return this.transport.request('GET', '/v1/subscriptions', { query: { ...filters }, options }, decodeSubscriptions); }
  /** Every subscription, one at a time, fetching each page as it is reached. */
  listAll(filters: Omit<SubscriptionListParams, 'offset'> = {}, options: ReadRequestOptions = {}): AsyncGenerator<SubscriptionResponse, void, undefined> {
    return offsetPages((f, o) => this.list(f, o), 'items', filters, options);
  }
  cancel(subscriptionId: string, input: CancelSubscriptionRequest = {}, options: WriteRequestOptions = {}) {
    return this.transport.request('DELETE', '/v1/subscriptions/' + idPath(subscriptionId, 'subscriptionId'), { body: input, options }, decodeSubscription);
  }
}
