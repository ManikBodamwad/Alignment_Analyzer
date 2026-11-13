"""Vercel Serverless Function Entrypoint for Stakeholder–Structure Alignment Analyzer."""

import sys
import urllib.parse
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.main import app as _fastapi_app  # noqa: E402


class VercelPathFixMiddleware:
    """
    On Vercel, rewrites route incoming API requests to `/api/index.py?__path=<original_path>`.
    This ASGI middleware extracts `__path`, cleans the query string, and restores the true
    request path and query parameters in the ASGI scope so FastAPI matches routes properly.
    """

    def __init__(self, asgi_app):
        self.asgi_app = asgi_app

    async def __call__(self, scope, receive, send):
        if scope["type"] in ("http", "websocket"):
            qs = scope.get("query_string", b"").decode("latin1", errors="ignore")
            if "__path=" in qs:
                parts = qs.split("&")
                target_path = None
                remaining = []
                for p in parts:
                    if p.startswith("__path="):
                        target_path = urllib.parse.unquote(p.split("=", 1)[1])
                    else:
                        remaining.append(p)
                if target_path:
                    scope["path"] = target_path
                    scope["raw_path"] = target_path.encode("latin1")
                    scope["query_string"] = "&".join(remaining).encode("latin1")

        await self.asgi_app(scope, receive, send)


app = VercelPathFixMiddleware(_fastapi_app)

__all__ = ["app"]
