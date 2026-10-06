# Bachs TypeScript SDK

Official server-side TypeScript SDK for Bachs. SDK version `1.0.0` and backend API `/v1` are separate version systems. Licensed under MIT; see LICENSE.

Server-side Node.js 22 or newer. Native fetch and crypto, no runtime dependencies. ES-module import and CommonJS require share the same runtime classes and errors.

```sh
npm install @bachs/sdk@1.0.0
```

```ts
import { Bachs } from '@bachs/sdk';

const bachs = new Bachs({
  apiKey: process.env.BACHS_API_KEY,
  environment: 'sandbox'
});

const product = await bachs.products.create({
  name: 'Pro Plan',
  price: { currency: 'USD', amount: '12.00' },
  billing_cycle: { interval: 'month', frequency: 1 }
}, { idempotencyKey: 'unique-operation-key-retained-by-your-app' });

const checkout = await bachs.checkoutSessions.create({
  product_cart: [{ product_id: product.id }],
  customer: { email: 'synthetic@example.com', name: 'Synthetic Customer' },
  success_url: 'https://your-public-app.example/success'
}, { idempotencyKey: 'another-unique-operation-key' });

// Redirect the customer to checkout.checkout_url in your application.
// A redirect alone does not prove payment or establish access rights.
const session = await bachs.checkoutSessions.get(checkout.checkout_id);
```

Configure the SDK on your backend; keep the secret key out of frontend code. Constructing a client sends no request. Environment selection is required; `baseURL` can override the endpoint for a proxy/local test server. The SDK does not provide cross-account Connect headers or browser credential management.

## Implemented resources

| Resource | Methods | Responsibility |
| --- | --- | --- |
| `products` | `create`, `get`, `list` | Reusable catalog offerings, including recurring pricing |
| `checkoutSessions` | `create`, `get` | Hosted checkout for a product cart or raw pricing |
| `payments` | `get`, `list` | Payment status and history; no beta direct charges |
| `subscriptions` | `get`, `list`, `cancel` | Customer subscription lookup and immediate/period-end cancellation |
| `customerPortal` | `createSession(customerId)` | A short-lived hosted billing URL for an authorized customer |
| `balances` | `get` | Balance buckets in their own currencies |
| `banks` | `list`, `resolveAccount` | Bank codes and account-name lookup |
| `payoutDestinations` | `create`, `get`, `list` | Destination records and provider review/usability state |
| `payoutQuotes` | `create` | Cross-currency source/recipient amounts and quote expiry |
| `payouts` | `create`, `get`, `list` | Own-balance payout request, status and history |
| `webhooks` | `constructEvent` | Verify raw signed bytes and return the event envelope |

Creation uses `(input, options?)`, retrieval uses `(id, options?)`, and listing uses `(filters?, options?)`. `subscriptions.cancel` uses `(id, input?, options?)`; `customerPortal.createSession` uses `(customerId, options?)`. `balances.get` has only options. No automatic pagination. Payment list items retain `id`; a retrieved payment retains `payment_id`. Payout and destination lists retain their own distinct envelopes.

Money remains decimal strings and fields remain in Bachs snake_case. Fixed product `price_type` can be omitted; fixed `amount` is required. Free/custom inputs support their verified omitted/null money fields. Checkout requires a cart or raw pricing, not both. Deprecated `return_url`, Connect split/account fields and beta payment-method saving are not exposed in the checkout input type.

## Subscription management

```ts
const page = await bachs.subscriptions.list({ customer_id: 'cust_synthetic' });
const scheduled = await bachs.subscriptions.cancel('sub_synthetic', {
  cancel_at_period_end: true
});
// For immediate cancellation, use cancel_at_period_end: false.
const portal = await bachs.customerPortal.createSession('cust_synthetic');
```

Bachs manages recurring billing after checkout. The merchant must authorize the requesting customer before lookup, cancellation or portal creation. A portal URL carries a credential: redirect the customer to it and do not log/share it. The SDK does not provide a customer portal UI, entitlement rules or renewal orchestration.

**Renewal verification limitation:** Bachs owns automatic recurring billing. This release has verified the first subscription payment and immediate/period-end cancellation responses in sandbox, but has not observed a second billing-cycle payment or its renewal webhook. No supported public sandbox cycle-advance/test-clock operation was found in the inspected API and CLI. Renewal behavior remains unverified by this SDK acceptance run; do not treat initial payment or sample/replayed events as renewal evidence.

## Payouts

```ts
const quote = await bachs.payoutQuotes.create({
  from_currency: 'USD', to_currency: 'NGN', amount: '120.00'
});
const payout = await bachs.payouts.create({
  destination: 'pd_synthetic', quote_id: quote.quote_id,
  reference: 'unique-payout-reference-retained-by-your-app'
}, { idempotencyKey: 'durable-operation-key-from-your-app' });
```

This is illustrative, not a request to send funds. Cross-currency payouts use `quote_id`; same-currency payouts use `amount` in the destination currency. Supply exactly one. `amount`/`currency` describe the recipient side; `fee`/`total_debited` use `source_currency`. A quote is not a payout, and an accepted/pending payout is not final delivery. Use retrieval/history and verified payout-result events to track progress.

Supply a unique payout `reference` and retain it for that operation, separately from its idempotency key. Although the API marks `reference` optional, the tested sandbox rejected an omitted reference with "Reference already exists for this organization". The SDK preserves API optionality; this workaround does not change its request type.

Use the provider's `is_usable` flag when preparing destinations. SDK payout creation does not secretly resolve/create a destination, fetch balances or impose a guessed admin policy. `banks.resolveAccount` can return `resolved: false` with a message without an HTTP error. Send bank codes from `banks.list`, not bank names.

## Webhooks

```ts
import { webhooks } from '@bachs/sdk';

const event = webhooks.constructEvent(
  rawRequestBody,
  requestHeaders,
  webhookSigningSecret
);
// Persist/check event.id atomically in your application before applying effects.
```

`rawRequestBody` is a string or Uint8Array before JSON parsing. Headers can be a standard Headers object or a Node-style header record. The signing secret is separate from the API key. The standalone helper needs no API client; `bachs.webhooks` exposes the same helper.

Prefer `X-Bachs-Signature-V2`; verification accepts any matching `v1` digest during rotation. Legacy `X-Bachs-Timestamp`/`X-Bachs-Signature` are also supported. Malformed V2 does not fall back to legacy. HMAC-SHA256 signs the exact timestamp plus raw bytes; comparison uses constant-time crypto. Default timestamp tolerance is 300 seconds in either direction, configurable through `{ toleranceSeconds }`. Unknown event types and extra fields are preserved. Only verified valid JSON/event envelopes are returned.

The helper does not store processed IDs, guarantee exactly-once effects or run business handlers. The merchant owns durable deduplication, HTTP acknowledgements, customer authorization and access changes. Do not reserialize JSON before signature verification.

## Request behavior and errors

- `timeoutMs`: default 30000 for the complete operation, including attempts, delays and response reading. Per-request override supported; range 1–2147483647 milliseconds to avoid Node timer overflow.
- `maxRetries`: default two additional GET attempts; client/read override supported. Network/body-transfer failures and HTTP 429/500/502/503/504 can retry. Other HTTP rejections and invalid successful response bodies do not retry.
- Waits start around 500/1000 ms with a small random spread. Valid `Retry-After` hints are honored. No further attempt when the required wait cannot fit within the remaining deadline.
- Writes are sent once, including writes with `idempotencyKey`. No generated keys or durable SDK key storage. A deliberate later repeat must retain the key and request; backend retention is not guaranteed by the SDK.
- `signal` supports cancellation. Stopping local work after a send cannot undo provider processing.

`BachsApiError` retains status, raw body, string errorCode, optional field errors/request ID/retry hint. `BachsNetworkError` retains its cause and any already observed response status; timeout and caller cancellation have distinct subclasses. `BachsResponseError` means successful HTTP with unusable JSON/shape. `BachsConfigError` rejects local configuration/request misuse. `BachsWebhookError` rejects invalid webhook authentication/envelopes.

Write 5xx, post-send network/cancellation/timeout failures and unusable successful write responses expose `outcomeUnknown: true`. Do not interpret an error as proof no operation exists; reconcile before creating a new operation key. Provider bodies and portal URLs may contain sensitive data. SDK has no logging hooks that automatically print them.

Response guards validate the fields promised by supported types, return the actual object and retain additional fields as unknown. Cadence requiredness and universal response completeness remain contract questions. Nested provider fields not fully typed remain unknown rather than receiving unchecked assertions.

## Verification

Run `npm install`, then `npm run check`: strict positive/negative type fixtures, both builds and 30 local scenarios covering client, resources and webhook/reliability behavior. Local tests cannot establish real provider processing or webhook delivery.

GitHub Actions runs the same `npm run check` command on Node 22 and 24 after installing locked dependencies with `npm ci`. It runs on pushes and pull requests, and can be started manually from the Actions tab. These checks use local fixtures, require no Bachs API key, and do not publish the package.

`node examples/sandbox-check.mjs --key-file <local-file>` uses the real sandbox for read-only SDK checks and saves sanitized local results. Only after approval, `--create-approved-records` additionally creates one USD12 monthly product, one unpaid checkout and one USD1-to-NGN quote. It never pays a checkout, sends a payout, cancels a subscription, creates a portal session or creates a destination. New writes use recorded unique operation keys and preserve uncertain outcomes. Do not rerun the write mode blindly: each new run describes new operations.

Sandbox acceptance verified an initial USD12 subscription purchase, matching checkout/payment/subscription records, hosted portal access, both SDK cancellation modes, sandbox destination create/get/list, and a completed USD10-to-NGN payout with a USD1 fee. A genuine signed payout webhook was forwarded by the official Bachs CLI, correlated to that payout and rejected after byte tampering. The documented sandbox bank fixture returned `resolved: false` but was approved and usable when saved; positive account-name resolution and production destination review were not established. Genuine renewal remains unverified as described above. These are bounded sandbox observations, not guarantees of production settlement, public webhook delivery retries or application deduplication. Final release review remains required; a green test count alone is not stable-release acceptance.

Both development logs are local working records. Never stage, commit, push or include them in the package.
