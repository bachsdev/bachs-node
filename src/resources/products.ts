import { Transport } from '../client.js';
import { idPath } from './ids.js';
import { cursorPages } from './pagination.js';
import { decodeProduct, decodeProductList } from '../product-responses.js';
import type { CreateProductRequest, ProductListParams, ProductListResponse, ProductResponse, ReadRequestOptions, WriteRequestOptions } from '../types.js';

export class Products {
  readonly #transport: Transport;
  constructor(transport: Transport) { this.#transport = transport; }

  create(input: CreateProductRequest, options: WriteRequestOptions = {}): Promise<ProductResponse> {
    return this.#transport.request('POST', '/v1/products', { body: input, options }, decodeProduct);
  }
  get(productId: string, options: ReadRequestOptions = {}): Promise<ProductResponse> {
    return this.#transport.request('GET', '/v1/products/' + idPath(productId, 'productId'), { options }, decodeProduct);
  }
  list(filters: ProductListParams = {}, options: ReadRequestOptions = {}): Promise<ProductListResponse> {
    return this.#transport.request('GET', '/v1/products', { query: { limit: filters.limit, cursor: filters.cursor, include_archived: filters.include_archived }, options }, decodeProductList);
  }
  /** Every product, one at a time, fetching each page as it is reached. */
  listAll(filters: Omit<ProductListParams, 'cursor'> = {}, options: ReadRequestOptions = {}): AsyncGenerator<ProductResponse, void, undefined> {
    return cursorPages((f, o) => this.list(f, o), filters, options);
  }
}
