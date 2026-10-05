import { Transport } from '../client.js';
import { decodeBanks, decodeResolvedAccount } from '../v1-responses.js';
import type { ReadRequestOptions, WriteRequestOptions } from '../types.js';
import type { ResolveBankAccountRequest } from '../v1-types.js';
export class Banks {
  constructor(private readonly transport: Transport) {}
  list(filters: { country?: string } = {}, options: ReadRequestOptions = {}) { return this.transport.request('GET', '/v1/reference/banks', { query: { ...filters }, options }, decodeBanks); }
  resolveAccount(input: ResolveBankAccountRequest, options: WriteRequestOptions = {}) { return this.transport.request('POST', '/v1/misc/bank-accounts/resolve', { body: input, options }, decodeResolvedAccount); }
}
