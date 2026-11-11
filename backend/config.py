"""Configuration and environment management for Stakeholder–Structure Alignment Analyzer."""

import os
from pathlib import Path
from pydantic import BaseModel


BASE_DIR = Path(__file__).resolve().parent.parent
IS_VERCEL = bool(os.getenv("VERCEL") or os.getenv("VERCEL_ENV"))
RUNTIME_WRITABLE_DIR = Path("/tmp") if IS_VERCEL else BASE_DIR


def _load_dotenv_if_present() -> None:
    env_file = BASE_DIR / ".env"
    if not env_file.exists():
        return
    try:
        for raw_line in env_file.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, val = line.split("=", 1)
            key = key.strip()
            val = val.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = val
    except OSError:
        pass


_load_dotenv_if_present()


def _default_database_url() -> str:
    env_url = os.getenv("DATABASE_URL", "").strip()
    if env_url:
        if env_url.startswith("postgres://"):
            return env_url.replace("postgres://", "postgresql://", 1)
        return env_url
    return f"sqlite:///{RUNTIME_WRITABLE_DIR / 'alignment_analyzer.db'}"


def _default_llm_provider() -> str:
    explicit = os.getenv("LLM_PROVIDER", "").strip()
    if explicit:
        return explicit
    if os.getenv("GROQ_API_KEY", "").strip():
        return "groq"
    return "evidence_engine"


class Settings(BaseModel):
    app_name: str = "Stakeholder–Structure Alignment Analyzer"
    app_version: str = "1.0.0"
    database_url: str = _default_database_url()
    llm_provider: str = _default_llm_provider()
    llm_model: str = os.getenv("LLM_MODEL", "openai/gpt-oss-120b")
    groq_api_key: str = os.getenv("GROQ_API_KEY", "")
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    embedding_provider: str = os.getenv("EMBEDDING_PROVIDER", "sentence_transformers")
    embedding_model: str = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
    embedding_dimension: int = int(os.getenv("EMBEDDING_DIMENSION", "384"))
    llm_retry_attempts: int = int(os.getenv("LLM_RETRY_ATTEMPTS", "3"))
    llm_timeout_seconds: int = int(os.getenv("LLM_TIMEOUT_SECONDS", "25"))
    stage_cache_enabled: bool = os.getenv("STAGE_CACHE_ENABLED", "true").lower() in ("true", "1", "yes")
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
    cache_dir: Path = Path(
        os.getenv("CACHE_DIR", str(RUNTIME_WRITABLE_DIR / "storage" / "cache"))
    )


settings = Settings()
try:
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    settings.backup_dir.mkdir(parents=True, exist_ok=True)
    settings.cache_dir.mkdir(parents=True, exist_ok=True)
except OSError:
    settings.upload_dir = Path("/tmp/storage/uploads")
    settings.backup_dir = Path("/tmp/storage/backups")
    settings.cache_dir = Path("/tmp/storage/cache")
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    settings.backup_dir.mkdir(parents=True, exist_ok=True)
    settings.cache_dir.mkdir(parents=True, exist_ok=True)
