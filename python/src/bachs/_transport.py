from __future__ import annotations

import json
import random
import re
import time
from collections.abc import Callable, Mapping
from email.utils import parsedate_to_datetime
from typing import Any, Generic, Literal, TypeVar
from urllib.parse import quote, urlsplit

import anyio
import anyio.lowlevel
import httpx

from ._errors import (
    BachsApiError,
    BachsConfigError,
    BachsError,
    BachsNetworkError,
    BachsResponseError,
    BachsTimeoutError,
)
from ._version import __version__

T = TypeVar("T")
Method = Literal["GET", "POST", "PATCH", "DELETE"]

DEFAULT_TIMEOUT = 30.0
DEFAULT_MAX_RETRIES = 2
# Python's sleep and socket timeouts have no int32 ceiling, but keep the Node SDK's bound for parity.
MAX_TIMEOUT = 2147483.647
RETRY_STATUSES = frozenset({429, 500, 502, 503, 504})
ENVIRONMENTS = {"sandbox": "https://sandbox-api.bachs.io", "production": "https://api.bachs.io"}
LOOPBACK = frozenset({"localhost", "127.0.0.1", "::1"})

# Indirection so tests can drive time deterministically.
_monotonic = time.monotonic
_sleep = time.sleep
_async_sleep = anyio.sleep
_random = random.random


def _timeout(value: Any, field: str = "timeout") -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not 0 < value <= MAX_TIMEOUT:
        raise BachsConfigError(f"{field} must be a number of seconds greater than 0 and at most {MAX_TIMEOUT}.")
    return float(value)


def _retries(value: Any) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise BachsConfigError("max_retries must be a non-negative integer.")
    return value


def _header_value(value: Any) -> bool:
    return isinstance(value, str) and value != "" and value == value.strip() and not re.search(r"[\r\n]", value)


def _retry_after_seconds(value: str | None) -> float:
    if value is None:
        return 0.0
    if re.fullmatch(r"[0-9]+(?:\.[0-9]+)?", value.strip()):
        return float(value)
    try:
        date = parsedate_to_datetime(value)
    except (TypeError, ValueError):
        return 0.0
    return max(0.0, date.timestamp() - time.time())


def _delay(attempt: int, hint: str | None) -> float:
    # Small random spread avoids synchronized retries; the overall deadline bounds all waits.
    backoff = min(2.0, 0.5 * 2.0 ** min(attempt, 3))
    return max(backoff * (0.75 + _random() * 0.5), _retry_after_seconds(hint))


def _query_value(value: object) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    return str(value)


def id_path(value: Any, name: str) -> str:
    """Keep an identifier inside one path segment, like encodeURIComponent."""
    if not isinstance(value, str) or value.strip() == "":
        raise BachsConfigError(f"{name} must be a non-empty string.")
    return quote(value, safe="-_.!~*'()")


class _Retry:
    def __init__(self, delay: float) -> None:
        self.delay = delay


class _Operation(Generic[T]):
    """One request: its deadline, retry budget and what is known about whether it reached Bachs.

    Everything except sending and waiting lives here, so the sync and async transports cannot drift apart.
    """

    def __init__(
        self,
        *,
        method: Method,
        url: str,
        params: list[tuple[str, str | int | float | bool | None]],
        headers: dict[str, str],
        content: bytes | None,
        decode: Callable[[Any], T],
        retries: int,
        deadline: float,
    ) -> None:
        self.method = method
        self.url = url
        self.params = params
        self.headers = headers
        self.content = content
        self.decode = decode
        self.write = method != "GET"
        self.retries = retries
        self.deadline = deadline
        self.attempt = 0
        self.sent = False
        self.response_status: int | None = None

    def remaining(self) -> float:
        return self.deadline - _monotonic()

    def build(self, client: httpx.Client | httpx.AsyncClient, remaining: float) -> httpx.Request:
        self.response_status = None
        return client.build_request(
            self.method, self.url, params=self.params, headers=self.headers, content=self.content,
            timeout=httpx.Timeout(remaining),
        )

    def failure(self, cause: BaseException | None, timed_out: bool) -> BachsNetworkError:
        unknown = self.write and self.sent
        if timed_out:
            error: BachsNetworkError = BachsTimeoutError(
                "The operation exceeded its total deadline.", unknown, self.response_status
            )
        else:
            error = BachsNetworkError("No usable response was received from Bachs.", unknown, self.response_status)
        error.__cause__ = cause
        return error

    def retry_delay(self, hint: str | None = None) -> float | None:
        """The wait before the next attempt, or None when this operation must not retry."""
        if self.write or self.attempt >= self.retries:
            return None
        delay = _delay(self.attempt, hint)
        if delay >= self.remaining():
            return None
        self.attempt += 1
        return delay

    def outcome(self, response: httpx.Response, raw: bytes) -> T | _Retry:
        text = raw.decode("utf-8", errors="replace")
        request_id = response.headers.get("x-request-id")
        parse_error: Exception | None = None
        try:
            value: Any = json.loads(text, parse_constant=_reject_constant)
        except (ValueError, RecursionError) as cause:
            value, parse_error = text, cause

        if not response.is_success:
            retry_after = response.headers.get("retry-after")
            error = BachsApiError(
                response.status_code, value, request_id, retry_after, self.write and response.status_code >= 500
            )
            delay = self.retry_delay(retry_after) if response.status_code in RETRY_STATUSES else None
            if delay is not None:
                return _Retry(delay)
            raise error
        if parse_error is not None:
            raise BachsResponseError(response.status_code, text, self.write, request_id) from parse_error
        try:
            result = self.decode(value)
        except Exception as cause:
            raise BachsResponseError(response.status_code, value, self.write, request_id) from cause
        if self.remaining() <= 0:
            raise self.failure(None, True)
        return result


class _BaseTransport:
    def __init__(
        self, *, api_key: str | None, environment: str, base_url: str | None, timeout: float, max_retries: int
    ) -> None:
        if not isinstance(api_key, str) or api_key.strip() == "":
            raise BachsConfigError("A server API key is required.")
        if not _header_value(api_key):
            raise BachsConfigError("The API key cannot contain surrounding whitespace or line breaks.")
        if environment not in ENVIRONMENTS:
            raise BachsConfigError("Choose environment sandbox or production explicitly.")
        base = base_url if base_url is not None else ENVIRONMENTS[environment]
        try:
            parts = urlsplit(base) if isinstance(base, str) else None
            hostname = parts.hostname if parts else None
        except ValueError as cause:
            raise BachsConfigError("base_url must be an absolute URL.") from cause
        if parts is None or not parts.scheme or not hostname:
            raise BachsConfigError("base_url must be an absolute URL.")
        loopback = hostname in LOOPBACK
        if (
            (parts.scheme != "https" and not (parts.scheme == "http" and loopback))
            or parts.username is not None
            or parts.password is not None
            or parts.query
            or parts.fragment
        ):
            raise BachsConfigError(
                "base_url must use HTTPS (or local HTTP for tests), without credentials, query or fragment."
            )
        self._api_key = api_key
        self._base_url = base.rstrip("/")
        self._timeout = _timeout(timeout)
        self._max_retries = _retries(max_retries)

    def __repr__(self) -> str:
        return f"{type(self).__name__}(base_url={self._base_url!r})"

    def _operation(
        self,
        method: Method,
        path: str,
        decode: Callable[[Any], T],
        *,
        body: Any,
        has_body: bool,
        query: Mapping[str, object] | None,
        timeout: float | None,
        max_retries: int | None,
        idempotency_key: str | None,
    ) -> _Operation[T]:
        started = _monotonic()
        budget = _timeout(timeout if timeout is not None else self._timeout)
        write = method != "GET"
        retries = 0 if write else _retries(max_retries if max_retries is not None else self._max_retries)

        content: bytes | None = None
        if has_body:
            try:
                content = json.dumps(body, separators=(",", ":"), allow_nan=False).encode("utf-8")
            except (TypeError, ValueError) as cause:
                raise BachsConfigError("Request data must be JSON-serializable.") from cause
        headers = {
            "Accept": "application/json",
            "Authorization": "Bearer " + self._api_key,
            "User-Agent": f"bachs-python/{__version__}",
        }
        if content is not None:
            headers["Content-Type"] = "application/json"
        if write and idempotency_key is not None:
            if not _header_value(idempotency_key):
                raise BachsConfigError(
                    "idempotency_key must be a non-empty header value without surrounding whitespace or line breaks."
                )
            headers["Idempotency-Key"] = idempotency_key
        params: list[tuple[str, str | int | float | bool | None]] = [
            (key, _query_value(value)) for key, value in (query or {}).items() if value is not None
        ]
        return _Operation(
            method=method, url=self._base_url + path, params=params, headers=headers, content=content,
            decode=decode, retries=retries, deadline=started + budget,
        )


class Transport(_BaseTransport):
    def __init__(self, *, http_client: httpx.Client | None, **options: Any) -> None:
        super().__init__(**options)
        self._owns_client = http_client is None
        self._client = http_client if http_client is not None else httpx.Client()

    def close(self) -> None:
        if self._owns_client:
            self._client.close()

    def request(
        self,
        method: Method,
        path: str,
        decode: Callable[[Any], T],
        *,
        body: Any = None,
        has_body: bool = False,
        query: Mapping[str, object] | None = None,
        timeout: float | None = None,
        max_retries: int | None = None,
        idempotency_key: str | None = None,
    ) -> T:
        op = self._operation(
            method, path, decode, body=body, has_body=has_body, query=query, timeout=timeout,
            max_retries=max_retries, idempotency_key=idempotency_key,
        )
        while True:
            remaining = op.remaining()
            if remaining <= 0:
                raise op.failure(None, True)
            try:
                request = op.build(self._client, remaining)
                op.sent = True
                response = self._client.send(request, stream=True, follow_redirects=False)
                try:
                    op.response_status = response.status_code
                    chunks: list[bytes] = []
                    for chunk in response.iter_bytes():
                        chunks.append(chunk)
                        if op.remaining() <= 0:
                            raise op.failure(None, True)
                finally:
                    response.close()
            except BachsError:
                raise
            except httpx.TimeoutException as cause:
                raise op.failure(cause, True) from cause
            except httpx.HTTPError as cause:
                delay = op.retry_delay()
                if delay is None:
                    raise op.failure(cause, False) from cause
                _sleep(delay)
                continue
            outcome = op.outcome(response, b"".join(chunks))
            if isinstance(outcome, _Retry):
                _sleep(outcome.delay)
                continue
            return outcome


class AsyncTransport(_BaseTransport):
    def __init__(self, *, http_client: httpx.AsyncClient | None, **options: Any) -> None:
        super().__init__(**options)
        self._owns_client = http_client is None
        self._client = http_client if http_client is not None else httpx.AsyncClient()

    async def aclose(self) -> None:
        if self._owns_client:
            await self._client.aclose()

    async def request(
        self,
        method: Method,
        path: str,
        decode: Callable[[Any], T],
        *,
        body: Any = None,
        has_body: bool = False,
        query: Mapping[str, object] | None = None,
        timeout: float | None = None,
        max_retries: int | None = None,
        idempotency_key: str | None = None,
    ) -> T:
        op = self._operation(
            method, path, decode, body=body, has_body=has_body, query=query, timeout=timeout,
            max_retries=max_retries, idempotency_key=idempotency_key,
        )
        # Cancellation interrupts any await, so the deadline holds exactly, including a stalled read.
        with anyio.move_on_after(op.remaining()):
            return await self._attempts(op)
        raise op.failure(None, True)

    async def _attempts(self, op: _Operation[T]) -> T:
        while True:
            remaining = op.remaining()
            if remaining <= 0:
                raise op.failure(None, True)
            # Act on a pending cancellation before sending: some transports never yield before the bytes go out.
            await anyio.lowlevel.checkpoint()
            try:
                request = op.build(self._client, remaining)
                op.sent = True
                response = await self._client.send(request, stream=True, follow_redirects=False)
                try:
                    op.response_status = response.status_code
                    chunks: list[bytes] = []
                    async for chunk in response.aiter_bytes():
                        chunks.append(chunk)
                        if op.remaining() <= 0:
                            raise op.failure(None, True)
                finally:
                    with anyio.CancelScope(shield=True):
                        await response.aclose()
            except BachsError:
                raise
            except httpx.TimeoutException as cause:
                raise op.failure(cause, True) from cause
            except httpx.HTTPError as cause:
                delay = op.retry_delay()
                if delay is None:
                    raise op.failure(cause, False) from cause
                await _async_sleep(delay)
                continue
            outcome = op.outcome(response, b"".join(chunks))
            if isinstance(outcome, _Retry):
                await _async_sleep(outcome.delay)
                continue
            return outcome


def _reject_constant(name: str) -> Any:
    # JSON has no NaN/Infinity; Python's parser accepts them unless told otherwise.
    raise ValueError(f"Invalid JSON constant {name}")
