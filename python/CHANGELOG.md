# Changelog

## 1.0.0a1 (unreleased)

First alpha of the official Bachs server-side Python SDK, ported from the TypeScript SDK `1.0.0`.

- Resources: products, checkout sessions, subscriptions, customer portal sessions, payments, balances, banks, payout destinations, payout quotes and payouts.
- Webhooks: `webhooks.construct_event` verifies `X-Bachs-Signature-V2` against the raw body, checks the timestamp tolerance, and accepts any valid `v1` signature during secret rotation.
- Writes are sent once. An uncertain outcome (a timeout or lost response) is reported as `outcome_unknown`, so the caller reconciles before retrying with the same idempotency key.
- `Bachs` (sync) and `AsyncBachs` (asyncio or trio) clients with identical methods, on `httpx`, typed with `TypedDict`. `AsyncBachs` enforces the timeout exactly and supports task cancellation. Requires Python 3.10 or later.

Not yet covered: customers, refunds, Connect (accounts and transfers), virtual accounts and disputes.

`0.0.1` on PyPI was a placeholder. Do not use it.
