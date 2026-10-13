from __future__ import annotations

from .._decoders import decode_subscription, decode_subscriptions
from .._transport import id_path
from ..types import CancelSubscriptionRequest, SubscriptionListParams, SubscriptionListResponse, SubscriptionResponse
from ._base import Resource


class Subscriptions(Resource):
    def get(
        self, subscription_id: str, *, timeout: float | None = None, max_retries: int | None = None
    ) -> SubscriptionResponse:
        return self._transport.request(
            "GET", "/v1/subscriptions/" + id_path(subscription_id, "subscription_id"), decode_subscription,
            timeout=timeout, max_retries=max_retries,
        )

    def list(
        self,
        params: SubscriptionListParams | None = None,
        *,
        timeout: float | None = None,
        max_retries: int | None = None,
    ) -> SubscriptionListResponse:
        return self._transport.request(
            "GET", "/v1/subscriptions", decode_subscriptions,
            query=params, timeout=timeout, max_retries=max_retries,
        )

    def cancel(
        self,
        subscription_id: str,
        params: CancelSubscriptionRequest | None = None,
        *,
        idempotency_key: str | None = None,
        timeout: float | None = None,
    ) -> SubscriptionResponse:
        """Cancel immediately (``cancel_at_period_end: False``) or at the end of the current period."""
        return self._transport.request(
            "DELETE", "/v1/subscriptions/" + id_path(subscription_id, "subscription_id"), decode_subscription,
            body=params if params is not None else {}, has_body=True,
            idempotency_key=idempotency_key, timeout=timeout,
        )
