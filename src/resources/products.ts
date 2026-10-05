import { Transport } from '../client.js';
import { BachsConfigError } from '../errors.js';
import { decodeProduct, decodeProductList } from '../product-responses.js';
import type { CreateProductRequest, ProductListParams, ProductListResponse, ProductResponse, ReadRequestOptions, WriteRequestOptions } from '../types.js';

export class Products {
  readonly #transport: Transport;
  constructor(transport: Transport) { this.#transport = transport; }

  create(input: CreateProductRequest, options: WriteRequestOptions = {}): Promise<ProductResponse> {
    return this.#transport.request('POST', '/v1/products', { body: input, options }, decodeProduct);
  }
  get(productId: string, options: ReadRequestOptions = {}): Promise<ProductResponse> {
    if (typeof productId !== 'string' || productId === '') throw new BachsConfigError('productId must be a non-empty string.');
    return this.#transport.request('GET', '/v1/products/' + encodeURIComponent(productId), { options }, decodeProduct);
  }
  list(filters: ProductListParams = {}, options: ReadRequestOptions = {}): Promise<ProductListResponse> {
    return this.#transport.request('GET', '/v1/products', { query: { limit: filters.limit, cursor: filters.cursor, include_archived: filters.include_archived }, options }, decodeProductList);
  }
}
