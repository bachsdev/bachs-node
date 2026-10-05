import type { PaginationResponse, SubscriptionCadence } from './types.js';
import type { Balance, BalancesResponse, Bank, BankListResponse, CheckoutIdentity, CheckoutSessionCreated, CheckoutSessionResponse, PaymentResponse, PaymentListItem, PaymentPagination, PaymentListResponse, SubscriptionCustomer, SubscriptionItem, SubscriptionResponse, SubscriptionListResponse, PortalSessionResponse, ResolveBankAccountResponse, PayoutDestinationResponse, PayoutDestinationListResponse, PayoutQuoteResponse, PayoutResponse, PayoutListResponse } from './v1-types.js';

export function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
const str = (value: unknown): value is string => typeof value === 'string';
const num = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const bool = (value: unknown): value is boolean => typeof value === 'boolean';
const nullableStr = (value: unknown) => value === null || str(value);
const nullableRecord = (value: unknown) => value === null || record(value);
function optional(value: Record<string, unknown>, key: string, check: (item: unknown) => boolean): boolean { return value[key] === undefined || check(value[key]); }
function strings(value: Record<string, unknown>, required: string[], ordinary: string[] = [], nullable: string[] = []): boolean {
  return required.every(key => str(value[key])) && ordinary.every(key => optional(value, key, str)) && nullable.every(key => optional(value, key, nullableStr));
}
function cadence(value: unknown): value is SubscriptionCadence {
  return record(value) && optional(value, 'interval', v => str(v) && ['day', 'week', 'month', 'year'].includes(v)) && optional(value, 'frequency', num);
}
function pagination(value: unknown): value is PaginationResponse {
  return record(value) && strings(value, [], [], ['next_cursor', 'prev_cursor']) && ['limit', 'offset', 'returned', 'total'].every(k => optional(value, k, num)) && optional(value, 'has_more', bool);
}
function paymentPagination(value: unknown): value is PaymentPagination {
  return pagination(value) && bool(value.has_more) && ['limit', 'offset', 'returned', 'total'].every(k => num(value[k]));
}
function identity(value: unknown): value is CheckoutIdentity { return record(value) && strings(value, [], [], ['id', 'email', 'name']); }
function payment(value: unknown): value is PaymentResponse {
  return record(value) && strings(value, ['payment_id', 'status', 'amount', 'currency', 'created_at', 'updated_at'], ['billing_reason'], ['reference', 'checkout_id', 'subscription_id', 'fee_usd', 'amount_paid', 'amount_remaining', 'payment_method', 'completed_at'])
    && optional(value, 'is_refundable', v => v === null || bool(v)) && optional(value, 'meta', nullableRecord);
}
function paymentListItem(value: unknown): value is PaymentListItem {
  return record(value) && strings(value, ['status', 'amount', 'currency', 'customer_name', 'customer_email'], [], ['id', 'reference', 'amount_paid', 'amount_remaining', 'settlement_amount', 'settlement_currency', 'fee', 'vat', 'transaction_date', 'completed_at']);
}
function subscriptionCustomer(value: unknown): value is SubscriptionCustomer { return record(value) && strings(value, [], ['customer_id'], ['email', 'name', 'phone_number']); }
function subscriptionItem(value: unknown): value is SubscriptionItem {
  return record(value) && strings(value, [], ['id', 'status', 'price_type', 'unit_amount', 'currency'], ['previously_billed_at', 'next_billed_at']) && optional(value, 'quantity', num) && optional(value, 'recurring', bool);
}
function subscription(value: unknown): value is SubscriptionResponse {
  return record(value) && strings(value, ['id', 'status'], ['collection_method', 'currency', 'amount', 'current_period_start', 'current_period_end', 'created_at'], ['payment_method_id', 'previously_billed_at', 'next_billed_at', 'trial_end', 'canceled_at'])
    && optional(value, 'customer', subscriptionCustomer) && optional(value, 'billing_cycle', cadence) && optional(value, 'quantity', num)
    && optional(value, 'cancel_at_period_end', bool) && optional(value, 'items', v => Array.isArray(v) && v.every(subscriptionItem)) && optional(value, 'metadata', record);
}
function balance(value: unknown): value is Balance { return record(value) && strings(value, ['currency', 'available_balance', 'pending_balance'], ['held_for_disputes']); }
function bank(value: unknown): value is Bank { return record(value) && strings(value, ['name', 'code']); }
function destination(value: unknown): value is PayoutDestinationResponse {
  return record(value) && strings(value, ['id', 'name', 'type', 'currency', 'status'], [], ['status_reason', 'account_number', 'account_name', 'bank_code', 'bank_name', 'phone_number', 'mobile_provider', 'wallet_address', 'network', 'reviewed_at', 'created_at', 'updated_at'])
    && optional(value, 'is_usable', bool) && optional(value, 'is_default', bool);
}
function payout(value: unknown): value is PayoutResponse {
  return record(value) && strings(value, ['id', 'status', 'amount', 'currency'], [], ['source_currency', 'fee', 'total_debited', 'destination', 'reference', 'failure_reason', 'created_at', 'completed_at']);
}
function decode<T>(value: unknown, check: (v: unknown) => v is T, shape: string): T {
  if (!check(value)) throw new Error('Response does not match the supported ' + shape + ' shape.');
  return value;
}
function createdCheckout(v: unknown): v is CheckoutSessionCreated { return record(v) && strings(v, ['checkout_id', 'checkout_url', 'status', 'expires_at', 'created_at']) && nullableStr(v.reference); }
function checkout(v: unknown): v is CheckoutSessionResponse {
  return record(v) && strings(v, ['checkout_id', 'status'], ['amount', 'currency', 'created_at', 'updated_at'], ['payment_status', 'source_type', 'reference', 'payment_method', 'success_url', 'cancel_url', 'billing_currency', 'session_mode', 'expires_at', 'completed_at'])
    && optional(v, 'charge', x => x === null || payment(x)) && ['customer', 'customer_details'].every(k => optional(v, k, x => x === null || identity(x))) && optional(v, 'metadata', nullableRecord);
}
function payments(v: unknown): v is PaymentListResponse { return record(v) && Array.isArray(v.items) && v.items.every(paymentListItem) && paymentPagination(v.pagination); }
function subscriptions(v: unknown): v is SubscriptionListResponse { return record(v) && Array.isArray(v.items) && v.items.every(subscription) && pagination(v.pagination); }
function portal(v: unknown): v is PortalSessionResponse { return record(v) && strings(v, ['id', 'url']); }
function balances(v: unknown): v is BalancesResponse { return record(v) && strings(v, ['account_id', 'total_balance_usd']) && Array.isArray(v.balances) && v.balances.every(balance) && optional(v, 'pending_settlements_by_day', x => Array.isArray(x) && x.every(record)); }
function banks(v: unknown): v is BankListResponse { return record(v) && str(v.country) && Array.isArray(v.banks) && v.banks.every(bank); }
function resolvedAccount(v: unknown): v is ResolveBankAccountResponse { return record(v) && bool(v.resolved) && ['account_name', 'account_number', 'message'].every(k => nullableStr(v[k])); }
function destinations(v: unknown): v is PayoutDestinationListResponse { return record(v) && Array.isArray(v.destinations) && v.destinations.every(destination) && ['total', 'limit', 'offset'].every(k => num(v[k])); }
function quote(v: unknown): v is PayoutQuoteResponse { return record(v) && strings(v, ['quote_id', 'from_currency', 'to_currency', 'from_amount', 'to_amount', 'exchange_rate', 'expires_at']); }
function payouts(v: unknown): v is PayoutListResponse { return record(v) && num(v.total) && Array.isArray(v.items) && v.items.every(payout); }
export const decodeCheckoutCreated = (v: unknown) => decode(v, createdCheckout, 'checkout creation');
export const decodeCheckout = (v: unknown) => decode(v, checkout, 'checkout');
export const decodePayment = (v: unknown) => decode(v, payment, 'payment');
export const decodePayments = (v: unknown) => decode(v, payments, 'payment list');
export const decodeSubscription = (v: unknown) => decode(v, subscription, 'subscription');
export const decodeSubscriptions = (v: unknown) => decode(v, subscriptions, 'subscription list');
export const decodePortal = (v: unknown) => decode(v, portal, 'portal session');
export const decodeBalances = (v: unknown) => decode(v, balances, 'balances');
export const decodeBanks = (v: unknown) => decode(v, banks, 'banks');
export const decodeResolvedAccount = (v: unknown) => decode(v, resolvedAccount, 'bank account resolution');
export const decodeDestination = (v: unknown) => decode(v, destination, 'payout destination');
export const decodeDestinations = (v: unknown) => decode(v, destinations, 'payout destination list');
export const decodeQuote = (v: unknown) => decode(v, quote, 'payout quote');
export const decodePayout = (v: unknown) => decode(v, payout, 'payout');
export const decodePayouts = (v: unknown) => decode(v, payouts, 'payout list');
