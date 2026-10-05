import type { JsonValue, PaginationResponse, SubscriptionCadence } from './types.js';

export type PaymentMethodCorridor = 'USD_CARD' | 'NGN_CARD' | 'NGN_BANK_TRANSFER' | 'MOMO_GHS' | 'MOMO_KES' | 'MOMO_TZS' | 'MOMO_UGX' | 'MOMO_XAF' | 'MOMO_XOF' | 'MOMO_RWF' | 'MOMO_MWK' | 'MOMO_ZMW' | 'CRYPTO';
export type CustomerInput = { customer_id: string; email?: never; name?: never } | { customer_id?: never; email: string; name: string; phone_number?: string | null };
export interface CheckoutPricing {
  currency: string;
  amount?: string;
  price_type?: 'fixed' | 'custom' | 'free';
  preset_amount?: string;
  minimum_amount?: string;
  maximum_amount?: string;
  currency_options?: Record<string, string>;
}
export interface CartPriceOverride {
  price_type?: 'fixed' | 'custom' | 'free';
  amount?: string | null;
  preset_amount?: string | null;
  minimum_amount?: string | null;
  maximum_amount?: string | null;
}
export interface CheckoutCartItem { product_id: string; quantity?: number; amount?: string | null; pricing?: CartPriceOverride | null }
export interface CheckoutCommonInput {
  customer?: CustomerInput | null;
  customer_creation?: 'always' | 'if_required';
  billing_currency?: string | null;
  payment_method_types?: PaymentMethodCorridor[] | null;
  success_url?: string;
  cancel_url?: string | null;
  reference?: string | null;
  metadata?: Record<string, JsonValue> | null;
  expires_in_minutes?: number;
}
export type CreateCheckoutSessionRequest = CheckoutCommonInput & (
  { product_cart: CheckoutCartItem[]; pricing?: never } |
  { product_cart?: never; pricing: CheckoutPricing }
);
export interface CheckoutSessionCreated {
  [key: string]: unknown;
  checkout_id: string;
  checkout_url: string;
  status: string;
  expires_at: string;
  created_at: string;
  reference: string | null;
}
export interface CheckoutIdentity { [key: string]: unknown; id?: string | null; email?: string | null; name?: string | null }
export interface CheckoutSessionResponse {
  [key: string]: unknown;
  checkout_id: string;
  status: string;
  amount?: string;
  currency?: string;
  payment_status?: string | null;
  source_type?: string | null;
  reference?: string | null;
  charge?: PaymentResponse | null;
  payment_method?: string | null;
  customer?: CheckoutIdentity | null;
  customer_details?: CheckoutIdentity | null;
  success_url?: string | null;
  cancel_url?: string | null;
  billing_currency?: string | null;
  session_mode?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
  expires_at?: string | null;
  completed_at?: string | null;
  updated_at?: string;
}
export type PaymentStatusFilter = 'created' | 'processing' | 'succeeded' | 'accepted' | 'failed' | 'expired' | 'cancelled' | 'refunded' | 'partially_refunded' | 'auto_refunded' | 'underpaid' | 'overpaid';
export interface PaymentResponse {
  [key: string]: unknown;
  payment_id: string;
  status: string;
  amount: string;
  currency: string;
  created_at: string;
  updated_at: string;
  reference?: string | null;
  checkout_id?: string | null;
  subscription_id?: string | null;
  billing_reason?: string;
  fee_usd?: string | null;
  amount_paid?: string | null;
  amount_remaining?: string | null;
  payment_method?: string | null;
  completed_at?: string | null;
  is_refundable?: boolean | null;
  meta?: Record<string, unknown> | null;
}
export interface PaymentListItem {
  [key: string]: unknown;
  id?: string | null;
  status: string;
  amount: string;
  currency: string;
  customer_name: string;
  customer_email: string;
  reference?: string | null;
  amount_paid?: string | null;
  amount_remaining?: string | null;
  settlement_amount?: string | null;
  settlement_currency?: string | null;
  fee?: string | null;
  vat?: string | null;
  transaction_date?: string | null;
  completed_at?: string | null;
}
export interface PaymentListParams { limit?: number; offset?: number; status_filter?: PaymentStatusFilter }
export interface PaymentPagination extends PaginationResponse { has_more: boolean; limit: number; offset: number; returned: number; total: number }
export interface PaymentListResponse { [key: string]: unknown; items: PaymentListItem[]; pagination: PaymentPagination }
export interface SubscriptionCustomer { [key: string]: unknown; customer_id?: string; email?: string | null; name?: string | null; phone_number?: string | null }
export interface SubscriptionItem {
  [key: string]: unknown;
  id?: string;
  status?: string;
  quantity?: number;
  recurring?: boolean;
  price_type?: string;
  unit_amount?: string;
  currency?: string;
  previously_billed_at?: string | null;
  next_billed_at?: string | null;
}
export interface SubscriptionResponse {
  [key: string]: unknown;
  id: string;
  status: string;
  customer?: SubscriptionCustomer;
  payment_method_id?: string | null;
  collection_method?: string;
  currency?: string;
  amount?: string;
  billing_cycle?: SubscriptionCadence;
  quantity?: number;
  current_period_start?: string;
  current_period_end?: string;
  previously_billed_at?: string | null;
  next_billed_at?: string | null;
  trial_end?: string | null;
  cancel_at_period_end?: boolean;
  canceled_at?: string | null;
  created_at?: string;
  items?: SubscriptionItem[];
  metadata?: Record<string, unknown>;
}
export interface SubscriptionListParams { limit?: number; offset?: number; customer_id?: string; status?: 'trialing' | 'active' | 'past_due' | 'unpaid' | 'canceled' }
export interface SubscriptionListResponse { [key: string]: unknown; items: SubscriptionResponse[]; pagination: PaginationResponse }
export interface CancelSubscriptionRequest { cancel_at_period_end?: boolean; reason?: string | null }
export interface PortalSessionResponse { [key: string]: unknown; id: string; url: string }
export interface Balance { [key: string]: unknown; currency: string; available_balance: string; pending_balance: string; held_for_disputes?: string }
export interface BalancesResponse { [key: string]: unknown; account_id: string; balances: Balance[]; total_balance_usd: string; pending_settlements_by_day?: Record<string, unknown>[] }
export interface Bank { [key: string]: unknown; name: string; code: string }
export interface BankListResponse { [key: string]: unknown; country: string; banks: Bank[] }
export interface ResolveBankAccountRequest { account_number: string; bank_code: string; country?: string | null }
export interface ResolveBankAccountResponse { [key: string]: unknown; resolved: boolean; account_name: string | null; account_number: string | null; message: string | null }
export interface CreatePayoutDestinationRequest {
  currency: string;
  name?: string | null;
  label?: string | null;
  type?: string | null;
  destination_type?: string | null;
  account_number?: string | null;
  bank_code?: string | null;
  account_name?: string | null;
  bank_name?: string | null;
  phone_number?: string | null;
  mobile_provider?: string | null;
  wallet_address?: string | null;
  network?: string | null;
  metadata?: Record<string, JsonValue> | null;
}
export interface PayoutDestinationResponse {
  [key: string]: unknown;
  id: string;
  name: string;
  type: string;
  currency: string;
  status: string;
  is_usable?: boolean;
  is_default?: boolean;
  status_reason?: string | null;
  account_number?: string | null;
  account_name?: string | null;
  bank_code?: string | null;
  bank_name?: string | null;
  phone_number?: string | null;
  mobile_provider?: string | null;
  wallet_address?: string | null;
  network?: string | null;
  reviewed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}
export interface PayoutDestinationListParams { currency?: string; status?: 'pending_review' | 'approved' | 'rejected'; limit?: number; offset?: number }
export interface PayoutDestinationListResponse { [key: string]: unknown; destinations: PayoutDestinationResponse[]; total: number; limit: number; offset: number }
export interface CreatePayoutQuoteRequest { from_currency: string; to_currency: string; amount: string; payout_method?: string | null }
export interface PayoutQuoteResponse { [key: string]: unknown; quote_id: string; from_currency: string; to_currency: string; from_amount: string; to_amount: string; exchange_rate: string; expires_at: string }
export type CreatePayoutRequest = {
  destination: string;
  reference?: string | null;
  metadata?: Record<string, JsonValue> | null;
} & ({ amount: string; quote_id?: never } | { amount?: never; quote_id: string });
export interface PayoutResponse {
  [key: string]: unknown;
  id: string;
  status: string;
  amount: string;
  currency: string;
  source_currency?: string | null;
  fee?: string | null;
  total_debited?: string | null;
  destination?: string | null;
  reference?: string | null;
  failure_reason?: string | null;
  created_at?: string | null;
  completed_at?: string | null;
}
export interface PayoutListParams { limit?: number; offset?: number; status_filter?: 'requested' | 'pending' | 'processing' | 'approved' | 'rejected' | 'completed' | 'failed' }
export interface PayoutListResponse { [key: string]: unknown; total: number; items: PayoutResponse[] }
export interface WebhookEvent { [key: string]: unknown; id: string; type: string; created_at: string; organization_id: string; data: Record<string, unknown> }
export type WebhookHeaders = Headers | Record<string, string | string[] | undefined>;
export interface WebhookOptions { toleranceSeconds?: number }
