from __future__ import annotations

from typing import Any

from .._decoders import decode_product, decode_product_list
from .._transport import id_path
from ..types import CreateProductRequest, ProductListParams, ProductListResponse, ProductResponse
from ._base import AsyncResource, Resource


def _list_query(params: ProductListParams | None) -> dict[str, Any]:
    filters = params or {}
    return {"limit": filters.get("limit"), "cursor": filters.get("cursor"),
            "include_archived": filters.get("include_archived")}


class Products(Resource):
    def create(
        self, params: CreateProductRequest, *, idempotency_key: str | None = None, timeout: float | None = None
    ) -> ProductResponse:
        return self._transport.request(
            "POST", "/v1/products", decode_product,
            body=params, has_body=True, idempotency_key=idempotency_key, timeout=timeout,
        )

    def get(self, product_id: str, *, timeout: float | None = None, max_retries: int | None = None) -> ProductResponse:
        return self._transport.request(
            "GET", "/v1/products/" + id_path(product_id, "product_id"), decode_product,
            timeout=timeout, max_retries=max_retries,
        )

    def list(
        self, params: ProductListParams | None = None, *, timeout: float | None = None, max_retries: int | None = None
    ) -> ProductListResponse:
        return self._transport.request(
            "GET", "/v1/products", decode_product_list,
            query=_list_query(params), timeout=timeout, max_retries=max_retries,
        )


class AsyncProducts(AsyncResource):
    async def create(
        self, params: CreateProductRequest, *, idempotency_key: str | None = None, timeout: float | None = None
    ) -> ProductResponse:
        return await self._transport.request(
            "POST", "/v1/products", decode_product,
            body=params, has_body=True, idempotency_key=idempotency_key, timeout=timeout,
        )

    async def get(
        self, product_id: str, *, timeout: float | None = None, max_retries: int | None = None
    ) -> ProductResponse:
        return await self._transport.request(
            "GET", "/v1/products/" + id_path(product_id, "product_id"), decode_product,
            timeout=timeout, max_retries=max_retries,
        )

    async def list(
        self, params: ProductListParams | None = None, *, timeout: float | None = None, max_retries: int | None = None
    ) -> ProductListResponse:
        return await self._transport.request(
            "GET", "/v1/products", decode_product_list,
            query=_list_query(params), timeout=timeout, max_retries=max_retries,
        )
