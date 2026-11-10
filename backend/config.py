"""Configuration and environment management for Stakeholder–Structure Alignment Analyzer."""

import os
from pathlib import Path
from pydantic import BaseModel


BASE_DIR = Path(__file__).resolve().parent.parent
IS_VERCEL = bool(os.getenv("VERCEL") or os.getenv("VERCEL_ENV"))
RUNTIME_WRITABLE_DIR = Path("/tmp") if IS_VERCEL else BASE_DIR


def _default_database_url() -> str:
    env_url = os.getenv("DATABASE_URL", "").strip()
    if env_url:
        # Normalize postgres:// to postgresql:// for SQLAlchemy 2.0 compatibility
        if env_url.startswith("postgres://"):
            return env_url.replace("postgres://", "postgresql://", 1)
        return env_url
    return f"sqlite:///{RUNTIME_WRITABLE_DIR / 'alignment_analyzer.db'}"


class Settings(BaseModel):
    app_name: str = "Stakeholder–Structure Alignment Analyzer"
    app_version: str = "1.0.0"
    database_url: str = _default_database_url()
    llm_provider: str = os.getenv("LLM_PROVIDER", "evidence_engine")
    llm_model: str = os.getenv("LLM_MODEL", "gpt-4o")
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    embedding_provider: str = os.getenv("EMBEDDING_PROVIDER", "hybrid_vector")
    embedding_dimension: int = int(os.getenv("EMBEDDING_DIMENSION", "384"))
    app_secret_key: str = os.getenv("APP_SECRET_KEY", "dev-secret-key-not-for-prod")
    default_user_name: str = os.getenv("DEFAULT_USER_NAME", "Lead Organizational Analyst")
    default_user_role: str = os.getenv("DEFAULT_USER_ROLE", "Admin")
    max_upload_size_mb: int = int(os.getenv("MAX_UPLOAD_SIZE_MB", "50"))
    upload_dir: Path = Path(
        os.getenv("UPLOAD_DIR", str(RUNTIME_WRITABLE_DIR / "storage" / "uploads"))
    )
    backup_dir: Path = Path(
        os.getenv("BACKUP_DIR", str(RUNTIME_WRITABLE_DIR / "storage" / "backups"))
    )


settings = Settings()
try:
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    settings.backup_dir.mkdir(parents=True, exist_ok=True)
except OSError:
    settings.upload_dir = Path("/tmp/storage/uploads")
    settings.backup_dir = Path("/tmp/storage/backups")
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    settings.backup_dir.mkdir(parents=True, exist_ok=True)
