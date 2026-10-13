from __future__ import annotations

from typing import Any


class BachsError(Exception):
    """Base class for every error raised by the SDK."""


class BachsConfigError(BachsError):
    """Local configuration or request misuse, raised before anything is sent."""


class BachsApiError(BachsError):
    """Bachs answered with a non-2xx HTTP status."""

    def __init__(
        self,
        status: int,
        body: Any,
        request_id: str | None = None,
        retry_after: str | None = None,
        outcome_unknown: bool = False,
    ) -> None:
        detail = body.get("detail") if isinstance(body, dict) else None
        super().__init__(detail if isinstance(detail, str) else f"Bachs returned HTTP {status}")
        self.status = status
        self.body = body
        error_code = body.get("error_code") if isinstance(body, dict) else None
        self.error_code: str | None = error_code if isinstance(error_code, str) else None
        errors = body.get("errors") if isinstance(body, dict) else None
        self.field_errors: list[Any] | None = errors if isinstance(errors, list) else None
        self.request_id = request_id
        self.retry_after = retry_after
        self.outcome_unknown = outcome_unknown


class BachsNetworkError(BachsError):
    """No usable response was received. The original exception is ``__cause__``."""

    def __init__(self, message: str, outcome_unknown: bool, response_status: int | None = None) -> None:
        super().__init__(message)
        self.outcome_unknown = outcome_unknown
        self.response_status = response_status


class BachsTimeoutError(BachsNetworkError):
    """The operation exceeded its total timeout, including retries and reading the response."""


class BachsResponseError(BachsError):
    """A successful HTTP status with a body that is not usable JSON or not the supported shape."""

    def __init__(self, status: int, body: Any, outcome_unknown: bool, request_id: str | None = None) -> None:
        super().__init__("Bachs returned a successful HTTP response with an unusable response body.")
        self.status = status
        self.body = body
        self.outcome_unknown = outcome_unknown
        self.request_id = request_id


class BachsWebhookError(BachsError):
    """The webhook failed authentication or is not a supported event envelope."""
