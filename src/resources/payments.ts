import { Transport } from '../client.js';
import { decodePayment, decodePayments } from '../v1-responses.js';
import type { ReadRequestOptions } from '../types.js';
import type { PaymentListItem, PaymentListParams } from '../v1-types.js';
import { idPath } from './ids.js';
import { offsetPages } from './pagination.js';
export class Payments {
  constructor(private readonly transport: Transport) {}
  get(paymentId: string, options: ReadRequestOptions = {}) { return this.transport.request('GET', '/v1/payments/' + idPath(paymentId, 'paymentId'), { options }, decodePayment); }
  list(filters: PaymentListParams = {}, options: ReadRequestOptions = {}) { return this.transport.request('GET', '/v1/payments', { query: { ...filters }, options }, decodePayments); }
  /** Every payment, one at a time, fetching each page as it is reached. */
  listAll(filters: Omit<PaymentListParams, 'offset'> = {}, options: ReadRequestOptions = {}): AsyncGenerator<PaymentListItem, void, undefined> {
    return offsetPages((f, o) => this.list(f, o), 'items', filters, options);
  }
}
