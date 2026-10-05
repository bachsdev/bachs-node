import { Transport } from '../client.js';
import { decodePortal } from '../v1-responses.js';
import type { WriteRequestOptions } from '../types.js';
import { idPath } from './ids.js';
export class CustomerPortal {
  constructor(private readonly transport: Transport) {}
  createSession(customerId: string, options: WriteRequestOptions = {}) { return this.transport.request('POST', '/v1/customers/' + idPath(customerId, 'customerId') + '/portal-sessions', { options }, decodePortal); }
}
