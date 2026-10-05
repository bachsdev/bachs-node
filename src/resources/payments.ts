import { Transport } from '../client.js';
import { decodePayment, decodePayments } from '../v1-responses.js';
import type { ReadRequestOptions } from '../types.js';
import type { PaymentListParams } from '../v1-types.js';
import { idPath } from './ids.js';
export class Payments {
  constructor(private readonly transport: Transport) {}
  get(paymentId: string, options: ReadRequestOptions = {}) { return this.transport.request('GET', '/v1/payments/' + idPath(paymentId, 'paymentId'), { options }, decodePayment); }
  list(filters: PaymentListParams = {}, options: ReadRequestOptions = {}) { return this.transport.request('GET', '/v1/payments', { query: { ...filters }, options }, decodePayments); }
}
