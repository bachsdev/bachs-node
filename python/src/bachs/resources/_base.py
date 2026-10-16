from __future__ import annotations

from .._transport import AsyncTransport, Transport


class Resource:
    def __init__(self, transport: Transport) -> None:
        self._transport = transport


class AsyncResource:
    def __init__(self, transport: AsyncTransport) -> None:
        self._transport = transport
