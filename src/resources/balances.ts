import { Transport } from '../client.js';
import { decodeBalances } from '../v1-responses.js';
import type { ReadRequestOptions } from '../types.js';
export class Balances {
  constructor(private readonly transport: Transport) {}
  get(options: ReadRequestOptions = {}) { return this.transport.request('GET', '/v1/balances', { options }, decodeBalances); }
}
