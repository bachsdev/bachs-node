export type ProductCurrency =
  | 'USD' | 'NGN' | 'GHS' | 'KES' | 'MWK' | 'RWF'
  | 'TZS' | 'UGX' | 'XAF' | 'XOF' | 'ZMW';

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export interface FixedCurrencyOptionInput {
  currency: ProductCurrency;
  amount: string;
}

export interface FreeCurrencyOptionInput {
  currency: ProductCurrency;
  amount?: null;
}

export interface CustomCurrencyOptionInput {
  currency: ProductCurrency;
  amount?: null;
  preset_amount?: string | null;
  minimum_amount?: string | null;
  maximum_amount?: string | null;
}

export interface FixedPriceInput {
  currency: ProductCurrency;
  price_type?: 'fixed';
  amount: string;
  currency_options?: FixedCurrencyOptionInput[] | null;
}

export interface FreePriceInput {
  currency: ProductCurrency;
  price_type: 'free';
  amount?: null;
  currency_options?: FreeCurrencyOptionInput[] | null;
}

export interface CustomPriceInput {
  currency: ProductCurrency;
  price_type: 'custom';
  amount?: null;
  preset_amount?: string | null;
  minimum_amount?: string | null;
  maximum_amount?: string | null;
  currency_options?: CustomCurrencyOptionInput[] | null;
}

export type PriceInput = FixedPriceInput | FreePriceInput | CustomPriceInput;

/** The published cadence schema does not specify a required-field list. */
export interface SubscriptionCadence {
  interval?: 'day' | 'week' | 'month' | 'year';
  frequency?: number;
}

export interface CreateProductRequest {
  name: string;
  description?: string | null;
  price: PriceInput;
  metadata?: { [key: string]: JsonValue } | null;
  billing_cycle?: SubscriptionCadence | null;
}

export interface ProductListParams {
  limit?: number;
  cursor?: string;
  include_archived?: boolean;
}

export interface CurrencyOptionResponse {
  [key: string]: unknown;
  currency: string;
  amount?: string | null;
  preset_amount?: string | null;
  minimum_amount?: string | null;
  maximum_amount?: string | null;
}

export interface PriceResponse {
  [key: string]: unknown;
  currency: string;
  price_type: 'fixed' | 'free' | 'custom';
  amount: string;
  preset_amount?: string | null;
  minimum_amount?: string | null;
  maximum_amount?: string | null;
  currency_options?: CurrencyOptionResponse[];
}

export interface ProductCurrencyPrice {
  [key: string]: unknown;
  currency?: string;
  amount?: string;
  minimum_amount?: string | null;
  maximum_amount?: string | null;
  is_default?: boolean;
}

export interface ProductResponse {
  [key: string]: unknown;
  id: string;
  name: string;
  price: PriceResponse;
  organization_id?: string;
  description?: string | null;
  status?: string;
  metadata?: Record<string, unknown> | null;
  media?: Record<string, unknown>[];
  actor_id?: string;
  created_at?: string;
  updated_at?: string;
  archived_at?: string | null;
  billing_cycle?: SubscriptionCadence | null;
  prices?: ProductCurrencyPrice[];
  total_payments?: number;
  total_amount?: string;
}

export interface PaginationResponse {
  [key: string]: unknown;
  next_cursor?: string | null;
  prev_cursor?: string | null;
  has_more?: boolean;
  limit?: number;
  offset?: number;
  returned?: number;
  total?: number;
}

export interface ProductListResponse {
  [key: string]: unknown;
  items: ProductResponse[];
  pagination: PaginationResponse;
}

export interface RequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface ReadRequestOptions extends RequestOptions {
  /** Number of additional read attempts; never enables mutation retries. */
  maxRetries?: number;
}

export interface WriteRequestOptions extends RequestOptions {
  /** Reuse this operation key when deliberately repeating the same write. */
  idempotencyKey?: string;
}

/** Receives SDK log lines. Any object with these methods works, such as console or a pino/winston logger. */
export interface BachsLogger {
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

export type BachsLogLevel = 'debug' | 'info' | 'warn' | 'off';

export interface BachsOptions {
  apiKey: string | undefined;
  /**
   * Detected from the key prefix (sk_sandbox_ or sk_live_) when omitted. If given and the key belongs to the
   * other environment, the client refuses to start.
   */
  environment?: 'sandbox' | 'production';
  /** Overrides the host, useful for a proxy or a local test server. */
  baseURL?: string;
  /** Where log lines go. Without one, warnings go to console.warn and nothing else is printed. */
  logger?: BachsLogger;
  /** Lowest level to log. Defaults to the BACHS_LOG environment variable, else "warn". */
  logLevel?: BachsLogLevel;
  /** Total operation budget, including retries, waits and reading the response. */
  timeoutMs?: number;
  /** Additional attempts for reads only. */
  maxRetries?: number;
}
