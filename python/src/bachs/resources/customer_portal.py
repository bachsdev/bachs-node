from __future__ import annotations

from .._decoders import decode_portal
from .._transport import id_path
from ..types import PortalSessionResponse
from ._base import AsyncResource, Resource


def _path(customer_id: str) -> str:
    return "/v1/customers/" + id_path(customer_id, "customer_id") + "/portal-sessions"


class CustomerPortal(Resource):
    def create_session(
        self, customer_id: str, *, idempotency_key: str | None = None, timeout: float | None = None
    ) -> PortalSessionResponse:
        """The returned URL carries a credential: redirect the customer to it and do not log or share it."""
        return self._transport.request(
            "POST", _path(customer_id), decode_portal, idempotency_key=idempotency_key, timeout=timeout
        )


class AsyncCustomerPortal(AsyncResource):
    async def create_session(
        self, customer_id: str, *, idempotency_key: str | None = None, timeout: float | None = None
    ) -> PortalSessionResponse:
        """The returned URL carries a credential: redirect the customer to it and do not log or share it."""
        return await self._transport.request(
            "POST", _path(customer_id), decode_portal, idempotency_key=idempotency_key, timeout=timeout
        )
