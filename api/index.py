"""Vercel Serverless Function Entrypoint for Stakeholder–Structure Alignment Analyzer."""

import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.main import app as _fastapi_app  # noqa: E402


class VercelPathFixMiddleware:
    """
    On Vercel, rewrites like `/api/(.*) -> /api/index.py` cause Vercel's Python ASGI runner
    to set scope['path'] to '/api/index.py'. This middleware recovers the original path from
    the `x-matched-path` header (or other proxy headers) so FastAPI can match routes properly.
    """

    def __init__(self, asgi_app):
        self.asgi_app = asgi_app

    async def __call__(self, scope, receive, send):
        if scope["type"] in ("http", "websocket"):
            headers = dict(scope.get("headers", []))
            matched_header = (
                headers.get(b"x-matched-path")
                or headers.get(b"x-vercel-matched-path")
                or headers.get(b"x-forwarded-uri")
                or headers.get(b"x-original-url")
                or headers.get(b"x-rewrite-url")
            )
            if matched_header:
                decoded = matched_header.decode("latin1", errors="ignore")
                if "?" in decoded:
                    clean_path, qs = decoded.split("?", 1)
                    scope["query_string"] = qs.encode("latin1")
                else:
                    clean_path = decoded

                if clean_path and clean_path not in ("/api/index.py", "/api/index"):
                    scope["path"] = clean_path
                    scope["raw_path"] = clean_path.encode("latin1")

        await self.asgi_app(scope, receive, send)


app = VercelPathFixMiddleware(_fastapi_app)

__all__ = ["app"]
