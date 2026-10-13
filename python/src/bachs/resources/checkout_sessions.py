from __future__ import annotations

from typing import Any

from .._decoders import decode_checkout, decode_checkout_created
from .._errors import BachsConfigError
from .._transport import id_path
from ..types import CheckoutSessionCreated, CheckoutSessionResponse, CreateCheckoutSessionRequest
from ._base import Resource


class CheckoutSessions(Resource):
    def create(
        self,
        params: CreateCheckoutSessionRequest,
        *,
        idempotency_key: str | None = None,
        timeout: float | None = None,
    ) -> CheckoutSessionCreated:
        value: Any = params
        if (
            not isinstance(value, dict)
            or ("product_cart" in value) == ("pricing" in value)
            or ("product_cart" in value and not isinstance(value["product_cart"], list))
            or ("pricing" in value and not isinstance(value["pricing"], dict))
        ):
            raise BachsConfigError("Supply exactly one of product_cart or pricing.")
        return self._transport.request(
            "POST", "/v1/checkout-sessions", decode_checkout_created,
            body=params, has_body=True, idempotency_key=idempotency_key, timeout=timeout,
        )

    def get(
        self, checkout_id: str, *, timeout: float | None = None, max_retries: int | None = None
    ) -> CheckoutSessionResponse:
        return self._transport.request(
            "GET", "/v1/checkout-sessions/" + id_path(checkout_id, "checkout_id"), decode_checkout,
            timeout=timeout, max_retries=max_retries,
        )
