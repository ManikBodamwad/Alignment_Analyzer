"""Main FastAPI Application Entrypoint for Stakeholder–Structure Alignment Analyzer."""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

from backend.config import BASE_DIR, settings
from backend.database import Base, SessionLocal, engine
from backend.routers import (
    analysis,
    assessments,
    companies,
    documents,
    evidence,
    reports,
    stakeholders,
)
from backend.seed import seed_initial_data
from backend.static_assets import BUNDLE_JS, INDEX_HTML

_DB_INITIALIZED = False


def ensure_db_initialized() -> None:
    """Idempotently initialize tables and seed baseline sample data (supports Vercel cold starts)."""
    global _DB_INITIALIZED
    if _DB_INITIALIZED:
        return
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_initial_data(db)
        _DB_INITIALIZED = True
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_db_initialized()
    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "Structured Organizational Diagnostic Platform evaluating alignment between "
        "Stakeholder Expectations, Organizational Structure, Governance, Capabilities, "
        "Resource Allocation, and Outcomes."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def _vercel_cold_start_init_middleware(request: Request, call_next):
    if not _DB_INITIALIZED:
        ensure_db_initialized()
    return await call_next(request)


app.include_router(companies.router)
app.include_router(assessments.router)
app.include_router(documents.router)
app.include_router(stakeholders.router)
app.include_router(evidence.router)
app.include_router(analysis.router)
app.include_router(reports.router)


@app.get("/api/index.py")
@app.get("/api")
def api_root(request: Request):
    return {
        "status": "online",
        "service": settings.app_name,
        "version": settings.app_version,
        "path": request.url.path,
        "scope_path": request.scope.get("path"),
        "headers": dict(request.headers),
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "application": settings.app_name,
        "version": settings.app_version,
        "llm_provider": settings.llm_provider,
        "embedding_provider": settings.embedding_provider,
    }


NO_CACHE_HEADERS = {
    "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
    "Pragma": "no-cache",
    "Expires": "0",
}


@app.get("/static/bundle.js")
@app.get("/bundle.js")
def serve_bundle_js():
    bundle_file = BASE_DIR / "frontend" / "public" / "bundle.js"
    if bundle_file.exists():
        return FileResponse(
            str(bundle_file),
            media_type="application/javascript",
            headers=NO_CACHE_HEADERS,
        )
    return Response(
        content=BUNDLE_JS,
        media_type="application/javascript",
        headers=NO_CACHE_HEADERS,
    )


FRONTEND_DIST = BASE_DIR / "frontend" / "public"
if FRONTEND_DIST.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIST)), name="static")


@app.get("/", response_class=HTMLResponse)
def serve_spa_index():
    index_file = BASE_DIR / "frontend" / "public" / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file), headers=NO_CACHE_HEADERS)
    return HTMLResponse(INDEX_HTML, headers=NO_CACHE_HEADERS)
