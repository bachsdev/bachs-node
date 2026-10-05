import { Transport } from '../client.js';
import { decodeQuote } from '../v1-responses.js';
import type { WriteRequestOptions } from '../types.js';
import type { CreatePayoutQuoteRequest } from '../v1-types.js';
export class PayoutQuotes {
  constructor(private readonly transport: Transport) {}
  create(input: CreatePayoutQuoteRequest, options: WriteRequestOptions = {}) { return this.transport.request('POST', '/v1/payouts/quotes', { body: input, options }, decodeQuote); }
}
