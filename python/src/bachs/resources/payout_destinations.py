from __future__ import annotations

from .._decoders import decode_destination, decode_destinations
from .._transport import id_path
from ..types import (
    CreatePayoutDestinationRequest,
    PayoutDestinationListParams,
    PayoutDestinationListResponse,
    PayoutDestinationResponse,
)
from ._base import Resource


class PayoutDestinations(Resource):
    def create(
        self,
        params: CreatePayoutDestinationRequest,
        *,
        idempotency_key: str | None = None,
        timeout: float | None = None,
    ) -> PayoutDestinationResponse:
        return self._transport.request(
            "POST", "/v1/payouts/destinations", decode_destination,
            body=params, has_body=True, idempotency_key=idempotency_key, timeout=timeout,
        )

    def get(
        self, destination_id: str, *, timeout: float | None = None, max_retries: int | None = None
    ) -> PayoutDestinationResponse:
        return self._transport.request(
            "GET", "/v1/payouts/destinations/" + id_path(destination_id, "destination_id"), decode_destination,
            timeout=timeout, max_retries=max_retries,
        )

    def list(
        self,
        params: PayoutDestinationListParams | None = None,
        *,
        timeout: float | None = None,
        max_retries: int | None = None,
    ) -> PayoutDestinationListResponse:
        return self._transport.request(
            "GET", "/v1/payouts/destinations", decode_destinations,
            query=params, timeout=timeout, max_retries=max_retries,
        )
