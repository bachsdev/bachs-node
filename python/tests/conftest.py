from __future__ import annotations

import json
import threading
from collections.abc import Callable, Iterator
from dataclasses import dataclass, field
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

import httpx
import pytest

import bachs._transport as transport_module
from bachs import AsyncBachs, Bachs

KEY = "synthetic-key-only-for-local-tests"


class FakeClock:
    """Replaces the transport's monotonic clock, sleep and jitter so retries and deadlines are deterministic."""

    def __init__(self) -> None:
        self.now = 1000.0
        self.sleeps: list[float] = []

    def monotonic(self) -> float:
        return self.now

    def sleep(self, seconds: float) -> None:
        self.sleeps.append(round(seconds, 6))
        self.now += seconds

    def advance(self, seconds: float) -> None:
        self.now += seconds


@pytest.fixture
def clock(monkeypatch: pytest.MonkeyPatch) -> FakeClock:
    fake = FakeClock()
    monkeypatch.setattr(transport_module, "_monotonic", fake.monotonic)
    monkeypatch.setattr(transport_module, "_sleep", fake.sleep)
    monkeypatch.setattr(transport_module, "_random", lambda: 0.5)
    return fake


@dataclass
class Call:
    method: str
    url: httpx.URL
    headers: httpx.Headers
    body: Any
    timeout: dict[str, float | None]


@dataclass
class Mock:
    """Records each request and answers with the next queued response, or a handler's result."""

    responses: list[Any] = field(default_factory=list)
    handler: Callable[[httpx.Request], httpx.Response] | None = None
    calls: list[Call] = field(default_factory=list)

    def __call__(self, request: httpx.Request) -> httpx.Response:
        content = request.read()
        self.calls.append(Call(
            method=request.method,
            url=request.url,
            headers=request.headers,
            body=json.loads(content) if content else None,
            timeout=request.extensions.get("timeout", {}),
        ))
        if self.handler is not None:
            return self.handler(request)
        assert self.responses, "Unexpected extra HTTP call"
        nxt = self.responses.pop(0)
        if isinstance(nxt, BaseException):
            raise nxt
        if isinstance(nxt, httpx.Response):
            return nxt
        return json_response(nxt)

    def client(self, **options: Any) -> Bachs:
        settings: dict[str, Any] = {"api_key": KEY, "environment": "sandbox"}
        settings.update(options)
        return Bachs(**settings, http_client=httpx.Client(transport=httpx.MockTransport(self)))

    def async_client(self, **options: Any) -> AsyncBachs:
        settings: dict[str, Any] = {"api_key": KEY, "environment": "sandbox"}
        settings.update(options)
        return AsyncBachs(**settings, http_client=httpx.AsyncClient(transport=httpx.MockTransport(self)))


def json_response(body: Any, status: int = 200, headers: dict[str, str] | None = None) -> httpx.Response:
    return httpx.Response(status, json=body, headers=headers)


@pytest.fixture(params=["asyncio", "trio"])
def anyio_backend(request: pytest.FixtureRequest) -> str:
    return str(request.param)


@pytest.fixture
def mock() -> Mock:
    return Mock()


@dataclass
class Record:
    method: str
    path: str
    headers: dict[str, str]
    body: str


Handler = Callable[[Record], tuple[int, dict[str, str], bytes]]


@pytest.fixture
def server() -> Iterator[Callable[[Handler], tuple[str, list[Record]]]]:
    """A real local HTTP server, for behavior a mock transport cannot show (redirects, raw bytes on the wire)."""
    servers: list[ThreadingHTTPServer] = []

    def start(handler: Handler) -> tuple[str, list[Record]]:
        records: list[Record] = []

        class RequestHandler(BaseHTTPRequestHandler):
            def handle_one(self) -> None:
                length = int(self.headers.get("content-length") or 0)
                record = Record(
                    self.command, self.path, {k.lower(): v for k, v in self.headers.items()},
                    self.rfile.read(length).decode("utf-8"),
                )
                records.append(record)
                status, headers, body = handler(record)
                self.send_response(status)
                for key, value in headers.items():
                    self.send_header(key, value)
                self.send_header("content-length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

            do_GET = do_POST = do_DELETE = handle_one

            def log_message(self, *args: Any) -> None:
                pass

        httpd = ThreadingHTTPServer(("127.0.0.1", 0), RequestHandler)
        servers.append(httpd)
        threading.Thread(target=httpd.serve_forever, kwargs={"poll_interval": 0.01}, daemon=True).start()
        return f"http://127.0.0.1:{httpd.server_address[1]}", records

    yield start
    for httpd in servers:
        httpd.shutdown()
        httpd.server_close()


def respond(body: Any, status: int = 200) -> tuple[int, dict[str, str], bytes]:
    return status, {"content-type": "application/json"}, json.dumps(body).encode()
