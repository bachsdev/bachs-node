import { Transport } from '../client.js';
import { decodeDestination, decodeDestinations } from '../v1-responses.js';
import type { ReadRequestOptions, WriteRequestOptions } from '../types.js';
import type { CreatePayoutDestinationRequest, PayoutDestinationListParams, PayoutDestinationResponse } from '../v1-types.js';
import { idPath } from './ids.js';
import { offsetPages } from './pagination.js';
export class PayoutDestinations {
  constructor(private readonly transport: Transport) {}
  create(input: CreatePayoutDestinationRequest, options: WriteRequestOptions = {}) { return this.transport.request('POST', '/v1/payouts/destinations', { body: input, options }, decodeDestination); }
  get(destinationId: string, options: ReadRequestOptions = {}) { return this.transport.request('GET', '/v1/payouts/destinations/' + idPath(destinationId, 'destinationId'), { options }, decodeDestination); }
  list(filters: PayoutDestinationListParams = {}, options: ReadRequestOptions = {}) { return this.transport.request('GET', '/v1/payouts/destinations', { query: { ...filters }, options }, decodeDestinations); }
  /** Every destination, one at a time, fetching each page as it is reached. */
  listAll(filters: Omit<PayoutDestinationListParams, 'offset'> = {}, options: ReadRequestOptions = {}): AsyncGenerator<PayoutDestinationResponse, void, undefined> {
    return offsetPages((f, o) => this.list(f, o), 'destinations', filters, options);
  }
}
