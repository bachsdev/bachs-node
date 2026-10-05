import { Transport } from '../client.js';
import { BachsConfigError } from '../errors.js';
import { decodeCheckout, decodeCheckoutCreated, record } from '../v1-responses.js';
import type { ReadRequestOptions, WriteRequestOptions } from '../types.js';
import type { CreateCheckoutSessionRequest } from '../v1-types.js';
import { idPath } from './ids.js';
export class CheckoutSessions {
  constructor(private readonly transport: Transport) {}
  create(input: CreateCheckoutSessionRequest, options: WriteRequestOptions = {}) {
    if (!record(input) || (input.product_cart !== undefined) === (input.pricing !== undefined) || (input.product_cart !== undefined && !Array.isArray(input.product_cart)) || (input.pricing !== undefined && !record(input.pricing))) {
      throw new BachsConfigError('Supply exactly one of product_cart or pricing.');
    }
    return this.transport.request('POST', '/v1/checkout-sessions', { body: input, options }, decodeCheckoutCreated);
  }
  get(checkoutId: string, options: ReadRequestOptions = {}) { return this.transport.request('GET', '/v1/checkout-sessions/' + idPath(checkoutId, 'checkoutId'), { options }, decodeCheckout); }
}
