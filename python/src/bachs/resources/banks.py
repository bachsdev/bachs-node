from __future__ import annotations

from .._decoders import decode_banks, decode_resolved_account
from ..types import BankListParams, BankListResponse, ResolveBankAccountRequest, ResolveBankAccountResponse
from ._base import Resource


class Banks(Resource):
    def list(
        self, params: BankListParams | None = None, *, timeout: float | None = None, max_retries: int | None = None
    ) -> BankListResponse:
        return self._transport.request(
            "GET", "/v1/reference/banks", decode_banks,
            query=params, timeout=timeout, max_retries=max_retries,
        )

    def resolve_account(
        self, params: ResolveBankAccountRequest, *, idempotency_key: str | None = None, timeout: float | None = None
    ) -> ResolveBankAccountResponse:
        """Can return ``resolved: False`` with a message without an HTTP error."""
        return self._transport.request(
            "POST", "/v1/misc/bank-accounts/resolve", decode_resolved_account,
            body=params, has_body=True, idempotency_key=idempotency_key, timeout=timeout,
        )
