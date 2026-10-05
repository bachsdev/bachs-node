import { Bachs } from '../../src/index.js';
import type { CreateProductRequest, PriceInput } from '../../src/index.js';
const fixed: PriceInput = { currency: 'USD', amount: '12.00' };
const free: PriceInput = { currency: 'USD', price_type: 'free', amount: null };
const custom: PriceInput = { currency: 'USD', price_type: 'custom', preset_amount: '12.00', minimum_amount: null };
const additional: PriceInput = { currency: 'USD', amount: '12.00', currency_options: [{ currency: 'NGN', amount: '12000.00' }] };
// @ts-expect-error The fixed branch requires an amount.
const missingAmount: PriceInput = { currency: 'USD', price_type: 'fixed' };
// @ts-expect-error Decimal money is a string; do not silently turn numbers into API amounts.
const numericAmount: PriceInput = { currency: 'USD', amount: 1200 };
// @ts-expect-error The free branch excludes a priced amount.
const pricedFree: PriceInput = { currency: 'USD', price_type: 'free', amount: '12.00' };
// @ts-expect-error Custom amounts belong in preset_amount, not a non-null amount.
const customAmount: PriceInput = { currency: 'USD', price_type: 'custom', amount: '12.00' };
// @ts-expect-error A fixed currency option also requires its decimal-string amount.
const missingOption: PriceInput = { currency: 'USD', amount: '12.00', currency_options: [{ currency: 'NGN' }] };
const bachs = new Bachs({ apiKey: 'synthetic-only', environment: 'sandbox' });
const input: CreateProductRequest = { name: 'Pro Plan', price: fixed };
void bachs.products.create(input, { idempotencyKey: 'catalog-pro-plan' });
// @ts-expect-error Write options cannot enable automatic retries.
void bachs.products.create(input, { maxRetries: 2 });
void bachs.products.get('prod_example', { maxRetries: 0 });
void [fixed, free, custom, additional, missingAmount, numericAmount, pricedFree, customAmount, missingOption];
