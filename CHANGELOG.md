# Changelog

## 1.0.1

- Identifiers of `.` or `..` are rejected with `BachsConfigError` before any request is sent. Previously they were passed through URL encoding unchanged and resolved as path navigation, so `payouts.get('..')` requested `/v1/` and `subscriptions.cancel('.')` sent `DELETE /v1/subscriptions/`, each carrying the API key. Only an application that passed untrusted input as an identifier was affected.
- `products.get` validates its identifier through the same helper as every other retrieval method.
- The release workflow builds and publishes in separate jobs: only the publish job holds the npm credential, it runs nothing from the repository, and it waits for the `npm` environment's reviewers. Dependency install scripts no longer run during a release, and the npm version used to publish is pinned.

## 1.0.0

First release of the official Bachs server-side SDK for Node.js and TypeScript.

- Resources: products, checkout sessions, subscriptions, customer portal sessions, payments, balances, banks, payout destinations, payout quotes and payouts.
- Webhooks: `webhooks.constructEvent` verifies `X-Bachs-Signature-V2` against the raw body, checks the timestamp tolerance, and accepts any valid `v1` signature during secret rotation.
- Writes are sent once. An uncertain outcome (a timeout or lost response) is reported as `outcomeUnknown`, so the caller reconciles before retrying with the same idempotency key.
- ESM and CommonJS builds with type definitions. Requires Node.js 22 or later.

Not yet covered: customers, refunds, Connect (accounts and transfers), virtual accounts and disputes. Use the documented API for these.

`0.0.1` was a placeholder. Do not use it.
