from __future__ import annotations

from .._decoders import decode_payment, decode_payments
from .._transport import id_path
from ..types import PaymentListParams, PaymentListResponse, PaymentResponse
from ._base import Resource


class Payments(Resource):
    def get(self, payment_id: str, *, timeout: float | None = None, max_retries: int | None = None) -> PaymentResponse:
        return self._transport.request(
            "GET", "/v1/payments/" + id_path(payment_id, "payment_id"), decode_payment,
            timeout=timeout, max_retries=max_retries,
        )

    def list(
        self, params: PaymentListParams | None = None, *, timeout: float | None = None, max_retries: int | None = None
    ) -> PaymentListResponse:
        return self._transport.request(
            "GET", "/v1/payments", decode_payments, query=params, timeout=timeout, max_retries=max_retries
        )
