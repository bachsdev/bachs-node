import { Transport } from './client.js';
import { Products } from './resources/products.js';
import { CheckoutSessions } from './resources/checkout-sessions.js';
import { Payments } from './resources/payments.js';
import { Subscriptions } from './resources/subscriptions.js';
import { CustomerPortal } from './resources/customer-portal.js';
import { Balances } from './resources/balances.js';
import { Banks } from './resources/banks.js';
import { PayoutDestinations } from './resources/payout-destinations.js';
import { PayoutQuotes } from './resources/payout-quotes.js';
import { Payouts } from './resources/payouts.js';
import { webhooks } from './webhooks.js';
import type { BachsOptions } from './types.js';

export class Bachs {
  readonly products: Products;
  readonly checkoutSessions: CheckoutSessions;
  readonly payments: Payments;
  readonly subscriptions: Subscriptions;
  readonly customerPortal: CustomerPortal;
  readonly balances: Balances;
  readonly banks: Banks;
  readonly payoutDestinations: PayoutDestinations;
  readonly payoutQuotes: PayoutQuotes;
  readonly payouts: Payouts;
  readonly webhooks = webhooks;
  constructor(options: BachsOptions) {
    const transport = new Transport(options);
    this.products = new Products(transport);
    this.checkoutSessions = new CheckoutSessions(transport);
    this.payments = new Payments(transport);
    this.subscriptions = new Subscriptions(transport);
    this.customerPortal = new CustomerPortal(transport);
    this.balances = new Balances(transport);
    this.banks = new Banks(transport);
    this.payoutDestinations = new PayoutDestinations(transport);
    this.payoutQuotes = new PayoutQuotes(transport);
    this.payouts = new Payouts(transport);
  }
}
export { BachsError, BachsApiError, BachsNetworkError, BachsTimeoutError, BachsAbortError, BachsResponseError, BachsConfigError, BachsWebhookError } from './errors.js';
export { webhooks } from './webhooks.js';
export type { BachsOptions, RequestOptions, ReadRequestOptions, WriteRequestOptions, ProductCurrency, JsonValue, FixedCurrencyOptionInput, FreeCurrencyOptionInput, CustomCurrencyOptionInput, FixedPriceInput, FreePriceInput, CustomPriceInput, PriceInput, SubscriptionCadence, CreateProductRequest, ProductListParams, CurrencyOptionResponse, PriceResponse, ProductCurrencyPrice, ProductResponse, PaginationResponse, ProductListResponse } from './types.js';
export type * from './v1-types.js';
