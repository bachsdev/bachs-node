# Changelog

## 1.0.0

First release of the official Bachs server-side SDK for Node.js and TypeScript.

- Resources: products, checkout sessions, subscriptions, customer portal sessions, payments, balances, banks, payout destinations, payout quotes and payouts.
- Webhooks: `webhooks.constructEvent` verifies `X-Bachs-Signature-V2` against the raw body, checks the timestamp tolerance, and accepts any valid `v1` signature during secret rotation.
- Writes are sent once. An uncertain outcome (a timeout or lost response) is reported as `outcomeUnknown`, so the caller reconciles before retrying with the same idempotency key.
- ESM and CommonJS builds with type definitions. Requires Node.js 22 or later.

Not yet covered: customers, refunds, Connect (accounts and transfers), virtual accounts and disputes. Use the documented API for these.

`0.0.1` was a placeholder. Do not use it.
