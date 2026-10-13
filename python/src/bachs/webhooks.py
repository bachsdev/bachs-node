"""Webhook signature verification. Usable without an API client, for webhook-only handlers."""

from __future__ import annotations

import hashlib
import hmac
import json
import math
import re
import time
from collections.abc import Mapping
from typing import Any, Union, cast

from ._errors import BachsConfigError, BachsWebhookError
from .types import WebhookEvent

__all__ = ["construct_event", "WebhookHeaders"]

# A dict, or any framework header mapping (Starlette, Werkzeug, Django). Duplicate headers are rejected.
WebhookHeaders = Mapping[str, Union[str, list[str], tuple[str, ...], None]]

_MAX_SAFE_INTEGER = 2**53 - 1


def _header(headers: Mapping[str, Any], name: str) -> str | None:
    wanted = name.lower()
    # items() exposes repeated headers separately for multi-value mappings such as Starlette's and Werkzeug's.
    values = [value for key, value in headers.items() if isinstance(key, str) and key.lower() == wanted]
    if len(values) > 1:
        raise BachsWebhookError("Duplicate webhook header.")
    value = values[0] if values else None
    if isinstance(value, (list, tuple)):
        if len(value) != 1:
            raise BachsWebhookError("Duplicate webhook header.")
        value = value[0]
    if value is not None and not isinstance(value, str):
        raise BachsWebhookError("Webhook header must be a string.")
    return value


def _event(value: Any) -> bool:
    return (
        isinstance(value, dict)
        and all(
            isinstance(value.get(key), str) and value[key] != ""
            for key in ("id", "type", "created_at", "organization_id")
        )
        and isinstance(value.get("data"), dict)
    )


def _reject_constant(name: str) -> Any:
    raise ValueError(f"Invalid JSON constant {name}")


def construct_event(
    raw_body: str | bytes | bytearray | memoryview,
    headers: WebhookHeaders,
    secret: str,
    *,
    tolerance: float = 300,
) -> WebhookEvent:
    """Verify the exact received bytes, then parse and return the event envelope.

    Pass the raw request body before any JSON parsing. Persisting ``event["id"]`` for deduplication
    and acknowledging the HTTP request belong to the caller.
    """
    if not isinstance(secret, str) or secret == "":
        raise BachsConfigError("A webhook signing secret is required.")
    if not isinstance(raw_body, (str, bytes, bytearray, memoryview)):
        raise BachsConfigError("Webhook body must be raw text or bytes, before JSON parsing.")
    if not isinstance(headers, Mapping):
        raise BachsConfigError("Webhook headers must be a header mapping.")
    if (
        isinstance(tolerance, bool)
        or not isinstance(tolerance, (int, float))
        or not math.isfinite(tolerance)
        or tolerance < 0
    ):
        raise BachsConfigError("tolerance must be a non-negative finite number of seconds.")
    body = raw_body.encode("utf-8") if isinstance(raw_body, str) else bytes(raw_body)

    v2 = _header(headers, "X-Bachs-Signature-V2")
    timestamp: str | None
    if v2 is not None:
        fields = [part.strip() for part in v2.split(",")]
        timestamps = [part for part in fields if part.startswith("t=")]
        if len(timestamps) != 1:
            raise BachsWebhookError("Webhook signature must contain one timestamp.")
        timestamp = timestamps[0][2:]
        signatures = [part[3:] for part in fields if part.startswith("v1=")]
    else:
        # Reject malformed V2 above rather than falling back to a legacy header.
        timestamp = _header(headers, "X-Bachs-Timestamp")
        signature = _header(headers, "X-Bachs-Signature")
        signatures = [] if signature is None else [signature]

    # The length bound also keeps int() clear of its digit limit for hostile input.
    if timestamp is None or not re.fullmatch(r"[0-9]{1,16}", timestamp) or int(timestamp) > _MAX_SAFE_INTEGER:
        raise BachsWebhookError("Webhook timestamp is missing or invalid.")
    if abs(time.time() - int(timestamp)) > tolerance:
        raise BachsWebhookError("Webhook timestamp is outside the permitted tolerance.")
    expected = hmac.new(secret.encode("utf-8"), timestamp.encode("ascii") + b"." + body, hashlib.sha256).digest()
    verified = any(
        re.fullmatch(r"[a-fA-F0-9]{64}", candidate) and hmac.compare_digest(expected, bytes.fromhex(candidate))
        for candidate in signatures
    )
    if not verified:
        raise BachsWebhookError("Webhook signature does not match.")
    try:
        parsed = json.loads(body.decode("utf-8"), parse_constant=_reject_constant)
    except (UnicodeDecodeError, ValueError, RecursionError) as cause:
        raise BachsWebhookError("Verified webhook body is not valid UTF-8 JSON.") from cause
    if not _event(parsed):
        raise BachsWebhookError("Verified webhook body is not a supported event envelope.")
    return cast(WebhookEvent, parsed)
