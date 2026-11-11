"""Vercel Serverless Function Entrypoint for Stakeholder–Structure Alignment Analyzer."""

import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.main import app  # noqa: E402

__all__ = ["app"]
