from __future__ import annotations

from .._transport import Transport


class Resource:
    def __init__(self, transport: Transport) -> None:
        self._transport = transport
