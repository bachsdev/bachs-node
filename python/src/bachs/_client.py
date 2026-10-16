from __future__ import annotations

from types import ModuleType, TracebackType
from typing import Literal

import httpx

from . import webhooks as _webhooks
from ._transport import DEFAULT_MAX_RETRIES, DEFAULT_TIMEOUT, AsyncTransport, Transport
from .resources import (
    AsyncBalances,
    AsyncBanks,
    AsyncCheckoutSessions,
    AsyncCustomerPortal,
    AsyncPayments,
    AsyncPayoutDestinations,
    AsyncPayoutQuotes,
    AsyncPayouts,
    AsyncProducts,
    AsyncSubscriptions,
    Balances,
    Banks,
    CheckoutSessions,
    CustomerPortal,
    Payments,
    PayoutDestinations,
    PayoutQuotes,
    Payouts,
    Products,
    Subscriptions,
)


class Bachs:
    """Server-side Bachs client. Constructing it sends no request.

    :param api_key: Secret server API key. Keep it out of frontend code.
    :param environment: ``"sandbox"`` or ``"production"``; there is no default.
    :param base_url: Overrides the host, useful for a proxy or a local test server.
    :param timeout: Total seconds per operation, including retries, waits and reading the response.
    :param max_retries: Additional attempts for reads only. Writes are always sent once.
    :param http_client: Optional ``httpx.Client`` for proxies or custom transports. The caller closes it.
    """

    webhooks: ModuleType = _webhooks

    def __init__(
        self,
        *,
        api_key: str | None,
        environment: Literal["sandbox", "production"],
        base_url: str | None = None,
        timeout: float = DEFAULT_TIMEOUT,
        max_retries: int = DEFAULT_MAX_RETRIES,
        http_client: httpx.Client | None = None,
    ) -> None:
        self._transport = Transport(
            api_key=api_key,
            environment=environment,
            base_url=base_url,
            timeout=timeout,
            max_retries=max_retries,
            http_client=http_client,
        )
        self.products = Products(self._transport)
        self.checkout_sessions = CheckoutSessions(self._transport)
        self.payments = Payments(self._transport)
        self.subscriptions = Subscriptions(self._transport)
        self.customer_portal = CustomerPortal(self._transport)
        self.balances = Balances(self._transport)
        self.banks = Banks(self._transport)
        self.payout_destinations = PayoutDestinations(self._transport)
        self.payout_quotes = PayoutQuotes(self._transport)
        self.payouts = Payouts(self._transport)

    def __repr__(self) -> str:
        return f"Bachs({self._transport!r})"

    def close(self) -> None:
        """Close connections the client opened. A caller-supplied ``http_client`` is left open."""
        self._transport.close()

    def __enter__(self) -> Bachs:
        return self

    def __exit__(
        self, exc_type: type[BaseException] | None, exc: BaseException | None, tb: TracebackType | None
    ) -> None:
        self.close()


class AsyncBachs:
    """Async server-side Bachs client for asyncio or trio. Constructing it sends no request.

    Takes the same options as :class:`Bachs`; ``http_client`` is an ``httpx.AsyncClient``. The timeout is
    enforced exactly, because cancellation interrupts any stalled network wait. Cancelling the calling task
    raises the framework's cancellation exception as usual; if that happens during a write, treat its outcome
    as unknown and reconcile before repeating it.
    """

    webhooks: ModuleType = _webhooks

    def __init__(
        self,
        *,
        api_key: str | None,
        environment: Literal["sandbox", "production"],
        base_url: str | None = None,
        timeout: float = DEFAULT_TIMEOUT,
        max_retries: int = DEFAULT_MAX_RETRIES,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        self._transport = AsyncTransport(
            api_key=api_key,
            environment=environment,
            base_url=base_url,
            timeout=timeout,
            max_retries=max_retries,
            http_client=http_client,
        )
        self.products = AsyncProducts(self._transport)
        self.checkout_sessions = AsyncCheckoutSessions(self._transport)
        self.payments = AsyncPayments(self._transport)
        self.subscriptions = AsyncSubscriptions(self._transport)
        self.customer_portal = AsyncCustomerPortal(self._transport)
        self.balances = AsyncBalances(self._transport)
        self.banks = AsyncBanks(self._transport)
        self.payout_destinations = AsyncPayoutDestinations(self._transport)
        self.payout_quotes = AsyncPayoutQuotes(self._transport)
        self.payouts = AsyncPayouts(self._transport)

    def __repr__(self) -> str:
        return f"AsyncBachs({self._transport!r})"

    async def aclose(self) -> None:
        """Close connections the client opened. A caller-supplied ``http_client`` is left open."""
        await self._transport.aclose()

    async def __aenter__(self) -> AsyncBachs:
        return self

    async def __aexit__(
        self, exc_type: type[BaseException] | None, exc: BaseException | None, tb: TracebackType | None
    ) -> None:
        await self.aclose()
