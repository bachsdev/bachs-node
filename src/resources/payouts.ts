import { Transport } from '../client.js';
import { BachsConfigError } from '../errors.js';
import { decodePayout, decodePayouts, record } from '../v1-responses.js';
import type { ReadRequestOptions, WriteRequestOptions } from '../types.js';
import type { CreatePayoutRequest, PayoutListParams } from '../v1-types.js';
import { idPath } from './ids.js';
export class Payouts {
  constructor(private readonly transport: Transport) {}
  create(input: CreatePayoutRequest, options: WriteRequestOptions = {}) {
    if (!record(input) || (input.amount !== undefined) === (input.quote_id !== undefined) || (input.amount !== undefined && (typeof input.amount !== 'string' || input.amount.trim() === '')) || (input.quote_id !== undefined && (typeof input.quote_id !== 'string' || input.quote_id.trim() === ''))) {
      throw new BachsConfigError('Supply exactly one non-empty amount or quote_id.');
    }
    return this.transport.request('POST', '/v1/payouts', { body: input, options }, decodePayout);
  }
  get(payoutId: string, options: ReadRequestOptions = {}) { return this.transport.request('GET', '/v1/payouts/' + idPath(payoutId, 'payoutId'), { options }, decodePayout); }
  list(filters: PayoutListParams = {}, options: ReadRequestOptions = {}) { return this.transport.request('GET', '/v1/payouts', { query: { ...filters }, options }, decodePayouts); }
}
