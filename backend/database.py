"""Database engine and session management supporting PostgreSQL (pgvector) and SQLite."""

import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from backend.config import settings


connect_args = {}
if settings.database_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    settings.database_url,
    connect_args=connect_args,
    pool_pre_ping=True,
)

if settings.database_url.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_database_backup() -> str:
    """Create a timestamped backup of the database (for SQLite) or export metadata snapshot."""
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    if settings.database_url.startswith("sqlite:///"):
        db_file = Path(settings.database_url.replace("sqlite:///", ""))
        if db_file.exists():
            dest = settings.backup_dir / f"alignment_analyzer_backup_{ts}.db"
            shutil.copy2(db_file, dest)
            return str(dest)
    dest = settings.backup_dir / f"alignment_analyzer_snapshot_{ts}.txt"
    dest.write_text(f"Database backup snapshot recorded at {ts} for {settings.database_url}\n")
    return str(dest)

