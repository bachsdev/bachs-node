from __future__ import annotations

from typing import Any

from .._decoders import decode_payout, decode_payouts
from .._errors import BachsConfigError
from .._transport import id_path
from ..types import CreatePayoutRequest, PayoutListParams, PayoutListResponse, PayoutResponse
from ._base import Resource


def _non_empty(value: Any) -> bool:
    return isinstance(value, str) and value.strip() != ""


class Payouts(Resource):
    def create(
        self, params: CreatePayoutRequest, *, idempotency_key: str | None = None, timeout: float | None = None
    ) -> PayoutResponse:
        """Supply exactly one of ``amount`` (same currency) or ``quote_id`` (cross-currency)."""
        value: Any = params
        if (
            not isinstance(value, dict)
            or ("amount" in value) == ("quote_id" in value)
            or ("amount" in value and not _non_empty(value["amount"]))
            or ("quote_id" in value and not _non_empty(value["quote_id"]))
        ):
            raise BachsConfigError("Supply exactly one non-empty amount or quote_id.")
        return self._transport.request(
            "POST", "/v1/payouts", decode_payout,
            body=params, has_body=True, idempotency_key=idempotency_key, timeout=timeout,
        )

    def get(self, payout_id: str, *, timeout: float | None = None, max_retries: int | None = None) -> PayoutResponse:
        return self._transport.request(
            "GET", "/v1/payouts/" + id_path(payout_id, "payout_id"), decode_payout,
            timeout=timeout, max_retries=max_retries,
        )

    def list(
        self, params: PayoutListParams | None = None, *, timeout: float | None = None, max_retries: int | None = None
    ) -> PayoutListResponse:
        return self._transport.request(
            "GET", "/v1/payouts", decode_payouts, query=params, timeout=timeout, max_retries=max_retries
        )
