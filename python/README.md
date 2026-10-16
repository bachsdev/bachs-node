# Bachs Python SDK

> **Status: alpha (`1.0.0a1`), not yet published.** A port of the [Bachs TypeScript SDK](https://github.com/bachsdev/bachs-node) `1.0.0` with the same resources, request semantics and webhook verification. The API may change before a stable release.

Official server-side Python SDK for Bachs, with a sync client (`Bachs`) and an async client (`AsyncBachs`) for asyncio or trio. Python 3.10 or newer. Built on [`httpx`](https://www.python-httpx.org/) and `anyio`.

```python
import os
from bachs import Bachs

bachs = Bachs(api_key=os.environ["BACHS_API_KEY"], environment="sandbox")

product = bachs.products.create(
    {
        "name": "Pro Plan",
        "price": {"currency": "USD", "amount": "12.00"},
        "billing_cycle": {"interval": "month", "frequency": 1},
    },
    idempotency_key="unique-operation-key-retained-by-your-app",
)

checkout = bachs.checkout_sessions.create(
    {
        "product_cart": [{"product_id": product["id"]}],
        "customer": {"email": "synthetic@example.com", "name": "Synthetic Customer"},
        "success_url": "https://your-public-app.example/success",
    },
    idempotency_key="another-unique-operation-key",
)

# Redirect the customer to checkout["checkout_url"] in your application.
# A redirect alone does not prove payment or establish access rights.
session = bachs.checkout_sessions.get(checkout["checkout_id"])
```

Configure the SDK on your backend and keep the secret key out of frontend code. Constructing a client sends no request. `environment` is required; `base_url` overrides the endpoint for a proxy or a local test server. Pass `http_client=httpx.Client(...)` to configure proxies or transports; the caller closes a client it supplies. Use `with Bachs(...) as bachs:` or `bachs.close()` to release connections the SDK opened.

## Async

`AsyncBachs` has the same resources, methods, arguments and errors; every method is a coroutine.

```python
from bachs import AsyncBachs

async with AsyncBachs(api_key=os.environ["BACHS_API_KEY"], environment="sandbox") as bachs:
    payout = await bachs.payouts.get("po_123")
```

Create one client at application startup and reuse it, so connections are pooled. Pass `http_client=httpx.AsyncClient(...)` to customize the transport. Cancelling the calling task (for example a request handler whose client disconnected) raises your framework's normal cancellation exception, not a `BachsError`. A cancelled read sends nothing further. A write cancelled after it was sent may still have reached Bachs, so treat its outcome as unknown and reconcile before repeating it.

## Resources

| Resource | Methods |
| --- | --- |
| `products` | `create`, `get`, `list` |
| `checkout_sessions` | `create`, `get` |
| `payments` | `get`, `list` |
| `subscriptions` | `get`, `list`, `cancel` |
| `customer_portal` | `create_session(customer_id)` |
| `balances` | `get` |
| `banks` | `list`, `resolve_account` |
| `payout_destinations` | `create`, `get`, `list` |
| `payout_quotes` | `create` |
| `payouts` | `create`, `get`, `list` |
| `webhooks` | `construct_event` |

Creation takes `(params, *, idempotency_key=None, timeout=None)`, retrieval takes `(id, *, timeout=None, max_retries=None)` and listing takes `(params=None, *, timeout=None, max_retries=None)`. Writes do not accept `max_retries`.

Requests and responses are plain dictionaries typed with `TypedDict` (see `bachs.types`), so fields stay in Bachs snake_case, money stays in decimal strings, and the difference between an omitted key and `None` reaches the API unchanged. Responses are validated against the fields their type promises and returned as received, including fields this SDK version does not know about.

The product, subscription, payout and limitation notes in the [TypeScript SDK README](https://github.com/bachsdev/bachs-node#readme) apply unchanged.

## Webhooks

```python
from bachs import webhooks

event = webhooks.construct_event(raw_body, request_headers, webhook_signing_secret)
# Persist/check event["id"] atomically in your application before applying effects.
```

`raw_body` is the request body as `bytes` or `str` before JSON parsing, for example `await request.body()` in Starlette/FastAPI, `request.get_data()` in Flask or `request.body` in Django. `request_headers` is any header mapping (a `dict` or the framework's headers object); repeated signature headers are rejected. `tolerance` defaults to 300 seconds. Verification follows the TypeScript SDK: `X-Bachs-Signature-V2` is preferred, any matching `v1` digest is accepted during rotation, and malformed V2 does not fall back to the legacy headers.

## Request behavior and errors

- `timeout`: default 30 seconds for the whole operation, including retries, waits and reading the response. See [How the timeout is enforced](#how-the-timeout-is-enforced).
- `max_retries`: default 2 additional attempts, for reads only. Network failures and HTTP 429/500/502/503/504 can retry, with backoff around 0.5 s and 1 s and valid `Retry-After` hints honored. No retry starts when its wait cannot fit within the remaining timeout.
- Writes are sent exactly once, with or without `idempotency_key`. The SDK does not generate keys.

| Error | Meaning |
| --- | --- |
| `BachsApiError` | Non-2xx HTTP response: `status`, `body`, `error_code`, `field_errors`, `request_id`, `retry_after` |
| `BachsNetworkError` | No usable response; the original exception is `__cause__`; `response_status` if headers arrived |
| `BachsTimeoutError` | Subclass of `BachsNetworkError`: the operation exceeded `timeout` |
| `BachsResponseError` | Successful HTTP status with unusable JSON or an unsupported shape |
| `BachsConfigError` | Local misconfiguration or request misuse, raised before sending |
| `BachsWebhookError` | Webhook failed verification or is not a supported envelope |

Write 5xx responses, network failures and timeouts after sending, and unusable successful write responses set `outcome_unknown = True`. Do not treat such an error as proof that no operation exists; reconcile before creating a new operation key.

## How the timeout is enforced

`timeout` is a budget for the whole operation, not for each network step. Both clients check it before each attempt, never start a retry whose wait does not fit, and cap every network wait at the time remaining.

- **`AsyncBachs` enforces the deadline exactly.** The whole operation runs inside a cancel scope, and cancellation interrupts whatever it is waiting on, including a server that has stopped sending halfway through a response.
- **`Bachs` (sync) can overrun it.** A blocking socket operation cannot be interrupted from the same thread, so `httpx` gives each network wait (connecting, sending, waiting for headers, reading the body) its own timeout, fixed when the attempt starts. If the server makes some progress and then goes quiet, the next wait still gets that full timeout. With `timeout=1.0` and a server that goes quiet after `t` seconds, the sync client gives up at about `t + 1` seconds, so at worst close to 2 s. Measured against a local server that stalls: going quiet at 0.1, 0.5 and 0.9 s, the sync client stopped at 1.22, 1.55 and 1.98 s, and `AsyncBachs` at 1.04 s each time.

An overrun needs a server or network path that makes progress and then stalls: a slow connection followed by no response, or a response cut off partway. Refused connections, error statuses, dropped connections and a server that never answers fail within the timeout in both clients. If an upper bound matters to you, for example a request handler with its own deadline, use `AsyncBachs`, or set the sync `timeout` to half of your limit.

## Differences from the TypeScript SDK

- Python naming: `checkout_sessions`, `customer_portal.create_session`, `banks.resolve_account`, `idempotency_key`, `max_retries`, `base_url`, `webhooks.construct_event(..., tolerance=...)`.
- `timeout` is in seconds (`timeoutMs` in TypeScript).
- There is no `signal` option and no `BachsAbortError`. With `AsyncBachs`, cancel the task instead; the sync client cannot be cancelled from outside.
- The sync client's timeout can overrun when a response stalls mid-body (see above). The TypeScript SDK and `AsyncBachs` stop at the exact deadline.
- `products.get` rejects whitespace-only IDs, like every other retrieval method.
- Requests send a `User-Agent: bachs-python/<version>` header.

## Development

```sh
python -m venv .venv && .venv/bin/pip install -e ".[dev]"
.venv/bin/ruff check src tests && .venv/bin/mypy && .venv/bin/pytest
```

`tests/` ports the TypeScript SDK's 30 local scenarios. `tests/test_async.py` runs `AsyncBachs` on asyncio and trio, checks that it sends exactly the same requests as `Bachs` for every method, and covers the exact deadline and cancellation (scenario 28). `tests/types/` holds static fixtures that mypy checks: each `# type: ignore[...]` marks an expected error, and strict mode fails if that error stops occurring. GitHub Actions runs these checks on Python 3.10 to 3.14 for every push and pull request.
