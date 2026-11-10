"""Security, RBAC, File Validation, Prompt Injection Defense, and Audit Logging."""

import re
from typing import Any, Dict, Optional, Tuple
from fastapi import Header, HTTPException
from sqlalchemy.orm import Session

from backend.config import settings
from backend.models import AuditLog


ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt", ".csv", ".xlsx", ".pptx", ".md"}

PROMPT_INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions", re.IGNORECASE),
    re.compile(r"disregard\s+(all\s+)?(previous|system)\s+prompts?", re.IGNORECASE),
    re.compile(r"you\s+are\s+now\s+in\s+developer\s+mode", re.IGNORECASE),
    re.compile(r"system\s*prompt\s*override", re.IGNORECASE),
    re.compile(r"reveal\s+(your\s+)?(api\s+keys?|system\s+prompt|secrets?)", re.IGNORECASE),
    re.compile(r"assign\s+strong\s+alignment\s+to\s+all", re.IGNORECASE),
    re.compile(r"override\s+scoring\s+methodology", re.IGNORECASE),
]


class UserContext:
    def __init__(self, username: str, role: str):
        self.username = username
        self.role = role


def get_current_user(
    x_user_name: Optional[str] = Header(default=None),
    x_user_role: Optional[str] = Header(default=None),
) -> UserContext:
    username = x_user_name or settings.default_user_name
    role = x_user_role or settings.default_user_role
    if role not in {"Admin", "Analyst", "Viewer"}:
        role = "Analyst"
    return UserContext(username=username, role=role)


def require_write_access(user: UserContext) -> None:
    if user.role not in {"Admin", "Analyst"}:
        raise HTTPException(
            status_code=403,
            detail=f"Role '{user.role}' does not have permission to modify assessments.",
        )


def validate_file_upload(filename: str, size_bytes: int) -> str:
    """Validate uploaded file extension and size."""
    if not filename or "." not in filename:
        raise HTTPException(
            status_code=400,
            detail="Invalid file name. Must include a supported extension (.pdf, .docx, .txt, .csv, .xlsx, .pptx).",
        )
    ext = "." + filename.rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file extension '{ext}'. Allowed formats: PDF, DOCX, TXT, CSV, XLSX, PPTX.",
        )
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    if size_bytes > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum allowed size of {settings.max_upload_size_mb} MB.",
        )
    if size_bytes == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty (0 bytes).")
    return ext.lstrip(".").upper()


def sanitize_untrusted_document_text(text: str) -> Tuple[str, bool]:
    """
    Detect and neutralize prompt-injection attempts inside untrusted uploaded documents.
    Returns (sanitized_text, injection_detected).
    """
    if not text:
        return "", False

    injection_detected = False
    sanitized_lines = []
    for line in text.splitlines():
        matched = False
        for pattern in PROMPT_INJECTION_PATTERNS:
            if pattern.search(line):
                injection_detected = True
                matched = True
                break
        if matched:
            sanitized_lines.append(
                "[SECURITY REDACTED: Untrusted directive / prompt-injection attempt neutralized]"
            )
        else:
            sanitized_lines.append(line)

    return "\n".join(sanitized_lines), injection_detected


def log_audit_event(
    db: Session,
    action_type: str,
    entity_type: str,
    actor: str = "Lead Organizational Analyst",
    role: str = "Admin",
    company_id: Optional[int] = None,
    assessment_period_id: Optional[int] = None,
    entity_id: Optional[int] = None,
    before_state: Optional[Dict[str, Any]] = None,
    after_state: Optional[Dict[str, Any]] = None,
    justification: Optional[str] = None,
) -> AuditLog:
    entry = AuditLog(
        company_id=company_id,
        assessment_period_id=assessment_period_id,
        actor=actor,
        role=role,
        action_type=action_type,
        entity_type=entity_type,
        entity_id=entity_id,
        before_state=before_state,
        after_state=after_state,
        justification=justification,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry

