import { BachsConfigError } from '../errors.js';
import type { ReadRequestOptions } from '../types.js';

type Page<Item> = { items: Item[]; next: (() => Promise<Page<Item>>) | undefined };

/** Walk every page, fetching the next one only when the caller reaches it. */
async function* walk<Item>(first: () => Promise<Page<Item>>): AsyncGenerator<Item, void, undefined> {
  let fetch: (() => Promise<Page<Item>>) | undefined = first;
  while (fetch !== undefined) {
    const page: Page<Item> = await fetch();
    for (const item of page.items) yield item;
    fetch = page.next;
  }
}

/** Products page by cursor: follow pagination.next_cursor until it is empty. */
export function cursorPages<Item, Filters extends { limit?: number; cursor?: string }>(
  list: (filters: Filters, options: ReadRequestOptions) => Promise<{ items: Item[]; pagination: { next_cursor?: string | null } }>,
  filters: Filters,
  options: ReadRequestOptions,
): AsyncGenerator<Item, void, undefined> {
  if ('cursor' in filters && filters.cursor !== undefined) throw new BachsConfigError('listAll starts from the first page; do not pass cursor.');
  const fetch = (cursor: string | undefined) => async (): Promise<Page<Item>> => {
    const page = await list({ ...filters, ...(cursor === undefined ? {} : { cursor }) }, options);
    const next = page.pagination.next_cursor;
    return { items: page.items, next: next ? fetch(next) : undefined };
  };
  return walk(fetch(undefined));
}

/** Payments, subscriptions, payouts and destinations page by limit and offset: stop at a short page or the total. */
export function offsetPages<Item, Filters extends { limit?: number; offset?: number }>(
  list: (filters: Filters, options: ReadRequestOptions) => Promise<Record<string, unknown>>,
  itemsField: string,
  filters: Filters,
  options: ReadRequestOptions,
): AsyncGenerator<Item, void, undefined> {
  if (filters.offset !== undefined) throw new BachsConfigError('listAll starts from the first page; do not pass offset.');
  const limit = filters.limit;
  const fetch = (offset: number) => async (): Promise<Page<Item>> => {
    const page = await list({ ...filters, offset }, options);
    const items = page[itemsField] as Item[];
    const total = typeof page.total === 'number' ? page.total : (page.pagination as { total?: number } | undefined)?.total;
    const hasMore = (page.pagination as { has_more?: boolean } | undefined)?.has_more;
    const nextOffset = offset + items.length;
    // Stop when the server says so, when the page came back short, or when the total is reached; an empty page
    // always stops, so a server that ignores offset cannot loop forever.
    const done = items.length === 0 || hasMore === false || (limit !== undefined && items.length < limit) || (total !== undefined && nextOffset >= total);
    return { items, next: done ? undefined : fetch(nextOffset) };
  };
  return walk(fetch(0));
}
