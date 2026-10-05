import type { CurrencyOptionResponse, PaginationResponse, PriceResponse, ProductCurrencyPrice, ProductListResponse, ProductResponse, SubscriptionCadence } from './types.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
const string = (value: unknown): value is string => typeof value === 'string';
const number = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const boolean = (value: unknown): value is boolean => typeof value === 'boolean';
const nullableString = (value: unknown): value is string | null => value === null || string(value);
function optional(value: Record<string, unknown>, key: string, check: (item: unknown) => boolean): boolean {
  return value[key] === undefined || check(value[key]);
}
function cadence(value: unknown): value is SubscriptionCadence {
  return isRecord(value)
    && optional(value, 'interval', item => item === 'day' || item === 'week' || item === 'month' || item === 'year')
    && optional(value, 'frequency', number);
}
function currencyOption(value: unknown): value is CurrencyOptionResponse {
  return isRecord(value) && string(value.currency)
    && ['amount', 'preset_amount', 'minimum_amount', 'maximum_amount'].every(key => optional(value, key, nullableString));
}
function price(value: unknown): value is PriceResponse {
  return isRecord(value) && string(value.currency) && string(value.amount)
    && (value.price_type === 'fixed' || value.price_type === 'free' || value.price_type === 'custom')
    && ['preset_amount', 'minimum_amount', 'maximum_amount'].every(key => optional(value, key, nullableString))
    && optional(value, 'currency_options', item => Array.isArray(item) && item.every(currencyOption));
}
function currencyPrice(value: unknown): value is ProductCurrencyPrice {
  return isRecord(value) && ['currency', 'amount'].every(key => optional(value, key, string))
    && ['minimum_amount', 'maximum_amount'].every(key => optional(value, key, nullableString))
    && optional(value, 'is_default', boolean);
}
function product(value: unknown): value is ProductResponse {
  return isRecord(value) && string(value.id) && string(value.name) && price(value.price)
    && ['organization_id', 'status', 'actor_id', 'created_at', 'updated_at', 'total_amount'].every(key => optional(value, key, string))
    && ['description', 'archived_at'].every(key => optional(value, key, nullableString))
    && optional(value, 'metadata', item => item === null || isRecord(item))
    && optional(value, 'media', item => Array.isArray(item) && item.every(isRecord))
    && optional(value, 'billing_cycle', item => item === null || cadence(item))
    && optional(value, 'prices', item => Array.isArray(item) && item.every(currencyPrice))
    && optional(value, 'total_payments', number);
}
function pagination(value: unknown): value is PaginationResponse {
  return isRecord(value)
    && ['next_cursor', 'prev_cursor'].every(key => optional(value, key, nullableString))
    && ['limit', 'offset', 'returned', 'total'].every(key => optional(value, key, number))
    && optional(value, 'has_more', boolean);
}

export function decodeProduct(value: unknown): ProductResponse {
  // Validate the fields this interface promises, retain the actual object and any future fields.
  if (!product(value)) throw new Error('Product response does not match the supported product shape.');
  return value;
}

function productList(value: unknown): value is ProductListResponse {
  return isRecord(value) && Array.isArray(value.items) && value.items.every(product) && pagination(value.pagination);
}

export function decodeProductList(value: unknown): ProductListResponse {
  if (!productList(value)) throw new Error('Product list response requires product items and pagination.');
  return value;
}
