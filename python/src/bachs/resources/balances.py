from __future__ import annotations

from .._decoders import decode_balances
from ..types import BalancesResponse
from ._base import AsyncResource, Resource


class Balances(Resource):
    def get(self, *, timeout: float | None = None, max_retries: int | None = None) -> BalancesResponse:
        return self._transport.request(
            "GET", "/v1/balances", decode_balances, timeout=timeout, max_retries=max_retries
        )


class AsyncBalances(AsyncResource):
    async def get(self, *, timeout: float | None = None, max_retries: int | None = None) -> BalancesResponse:
        return await self._transport.request(
            "GET", "/v1/balances", decode_balances, timeout=timeout, max_retries=max_retries
        )
