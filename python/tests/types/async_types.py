"""Static fixtures, checked by mypy and never run. Each ignore marks an expected error, like @ts-expect-error."""

import httpx
from typing_extensions import assert_type

from bachs import AsyncBachs
from bachs.types import PayoutResponse, ProductListResponse


async def usage() -> None:
    async with AsyncBachs(api_key="synthetic", environment="sandbox", http_client=httpx.AsyncClient()) as bachs:
        assert_type(await bachs.payouts.create({"destination": "pd_x", "amount": "1.00"}), PayoutResponse)
        assert_type(await bachs.products.list({"limit": 1}), ProductListResponse)
        # Results must be awaited before use.
        bachs.payouts.get("po_x")["status"]  # type: ignore[index]
        # Write retry controls are excluded, as on the sync client.
        await bachs.payouts.create({"destination": "pd_x", "amount": "1.00"}, max_retries=2)  # type: ignore[call-arg]
        # Money remains a decimal string.
        await bachs.payouts.create({"destination": "pd_x", "amount": 1})  # type: ignore[typeddict-item]


# The async client takes an httpx.AsyncClient, not a sync one.
AsyncBachs(api_key="synthetic", environment="sandbox", http_client=httpx.Client())  # type: ignore[arg-type]
