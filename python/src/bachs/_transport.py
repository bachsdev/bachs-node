from __future__ import annotations

import json
import random
import re
import time
from collections.abc import Callable, Mapping
from email.utils import parsedate_to_datetime
from typing import Any, Literal, TypeVar
from urllib.parse import quote, urlsplit

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


class Transport:
    def __init__(
        self,
        *,
        api_key: str | None,
        environment: str,
        base_url: str | None,
        timeout: float,
        max_retries: int,
        http_client: httpx.Client | None,
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
        self._owns_client = http_client is None
        self._client = http_client if http_client is not None else httpx.Client()

    def __repr__(self) -> str:
        return f"Transport(base_url={self._base_url!r})"

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
        started = _monotonic()
        budget = _timeout(timeout if timeout is not None else self._timeout)
        write = method != "GET"
        retries = 0 if write else _retries(max_retries if max_retries is not None else self._max_retries)
        deadline = started + budget

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
        url = self._base_url + path

        sent = False
        response_status: int | None = None

        def failure(cause: BaseException | None, timed_out: bool) -> BachsNetworkError:
            unknown = write and sent
            if timed_out:
                error: BachsNetworkError = BachsTimeoutError(
                    "The operation exceeded its total deadline.", unknown, response_status
                )
            else:
                error = BachsNetworkError("No usable response was received from Bachs.", unknown, response_status)
            error.__cause__ = cause
            return error

        attempt = 0
        while True:
            response_status = None
            remaining = deadline - _monotonic()
            if remaining <= 0:
                raise failure(None, True)
            try:
                request = self._client.build_request(
                    method, url, params=params, headers=headers, content=content, timeout=httpx.Timeout(remaining)
                )
                sent = True
                response = self._client.send(request, stream=True, follow_redirects=False)
                try:
                    response_status = response.status_code
                    chunks: list[bytes] = []
                    for chunk in response.iter_bytes():
                        chunks.append(chunk)
                        if _monotonic() >= deadline:
                            raise failure(None, True)
                finally:
                    response.close()
                raw = b"".join(chunks)
            except BachsError:
                raise
            except httpx.TimeoutException as cause:
                raise failure(cause, True) from cause
            except httpx.HTTPError as cause:
                if not write and attempt < retries:
                    delay = _delay(attempt, None)
                    if delay < deadline - _monotonic():
                        _sleep(delay)
                        attempt += 1
                        continue
                raise failure(cause, False) from cause

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
                    response.status_code, value, request_id, retry_after, write and response.status_code >= 500
                )
                if not write and attempt < retries and response.status_code in RETRY_STATUSES:
                    delay = _delay(attempt, retry_after)
                    if delay < deadline - _monotonic():
                        _sleep(delay)
                        attempt += 1
                        continue
                raise error
            if parse_error is not None:
                raise BachsResponseError(response.status_code, text, write, request_id) from parse_error
            try:
                result = decode(value)
            except Exception as cause:
                raise BachsResponseError(response.status_code, value, write, request_id) from cause
            if _monotonic() >= deadline:
                raise failure(None, True)
            return result


def _reject_constant(name: str) -> Any:
    # JSON has no NaN/Infinity; Python's parser accepts them unless told otherwise.
    raise ValueError(f"Invalid JSON constant {name}")
