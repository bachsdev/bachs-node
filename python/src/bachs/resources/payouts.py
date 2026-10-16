from __future__ import annotations

from typing import Any

from .._decoders import decode_payout, decode_payouts
from .._errors import BachsConfigError
from .._transport import id_path
from ..types import CreatePayoutRequest, PayoutListParams, PayoutListResponse, PayoutResponse
from ._base import AsyncResource, Resource


def _non_empty(value: Any) -> bool:
    return isinstance(value, str) and value.strip() != ""


def _check(params: Any) -> None:
    if (
        not isinstance(params, dict)
        or ("amount" in params) == ("quote_id" in params)
        or ("amount" in params and not _non_empty(params["amount"]))
        or ("quote_id" in params and not _non_empty(params["quote_id"]))
    ):
        raise BachsConfigError("Supply exactly one non-empty amount or quote_id.")


class Payouts(Resource):
    def create(
        self, params: CreatePayoutRequest, *, idempotency_key: str | None = None, timeout: float | None = None
    ) -> PayoutResponse:
        """Supply exactly one of ``amount`` (same currency) or ``quote_id`` (cross-currency)."""
        _check(params)
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


class AsyncPayouts(AsyncResource):
    async def create(
        self, params: CreatePayoutRequest, *, idempotency_key: str | None = None, timeout: float | None = None
    ) -> PayoutResponse:
        """Supply exactly one of ``amount`` (same currency) or ``quote_id`` (cross-currency)."""
        _check(params)
        return await self._transport.request(
            "POST", "/v1/payouts", decode_payout,
            body=params, has_body=True, idempotency_key=idempotency_key, timeout=timeout,
        )

    async def get(
        self, payout_id: str, *, timeout: float | None = None, max_retries: int | None = None
    ) -> PayoutResponse:
        return await self._transport.request(
            "GET", "/v1/payouts/" + id_path(payout_id, "payout_id"), decode_payout,
            timeout=timeout, max_retries=max_retries,
        )

    async def list(
        self, params: PayoutListParams | None = None, *, timeout: float | None = None, max_retries: int | None = None
    ) -> PayoutListResponse:
        return await self._transport.request(
            "GET", "/v1/payouts", decode_payouts, query=params, timeout=timeout, max_retries=max_retries
        )
