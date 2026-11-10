"""Documents & RAG Ingestion REST API Router."""

import base64
from email.parser import BytesParser
from email.policy import default as default_email_policy
import json
from typing import Any, Dict, List, Optional, Tuple
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from backend.config import settings
from backend.database import get_db
from backend.models import AssessmentPeriod, Document, DocumentChunk
from backend.schemas import DocumentResponse
from backend.security import (
    UserContext,
    get_current_user,
    log_audit_event,
    require_write_access,
    sanitize_untrusted_document_text,
    validate_file_upload,
)
from backend.services.ingestion import (
    chunk_document_metadata_aware,
    extract_text_from_bytes,
)
from backend.services.vector_store import compute_embedding, search_relevant_chunks

router = APIRouter(prefix="/api/documents", tags=["Documents"])


def _process_and_index_document(
    db: Session,
    doc: Document,
    file_bytes: bytes,
) -> Document:
    """Validate, extract text, sanitize prompt-injection, chunk, embed, and store."""
    try:
        raw_text = extract_text_from_bytes(file_bytes, doc.file_type, doc.title)
        sanitized_text, injection_flag = sanitize_untrusted_document_text(raw_text)
        doc.extracted_text = sanitized_text
        doc.prompt_injection_flag = injection_flag
        doc.processing_status = "completed"
        doc.error_message = None

        # Clear existing chunks if retrying
        db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).delete()
        db.flush()

        chunks_data = chunk_document_metadata_aware(sanitized_text)
        for ch in chunks_data:
            emb = compute_embedding(ch.content)
            db_chunk = DocumentChunk(
                document_id=doc.id,
                company_id=doc.company_id,
                assessment_period_id=doc.assessment_period_id,
                chunk_index=ch.chunk_index,
                page_number=ch.page_number,
                section_heading=ch.section_heading,
                content=ch.content,
                token_count=ch.token_count,
                source_url=doc.source_url,
                publication_date=doc.publication_date,
                financial_year=doc.financial_year,
                document_category=doc.category,
                embedding_json=emb,
            )
            db.add(db_chunk)

        db.commit()
        db.refresh(doc)
        return doc
    except Exception as exc:
        doc.processing_status = "failed"
        doc.error_message = str(exc)
        db.commit()
        db.refresh(doc)
        return doc


def _parse_multipart_request(content_type: str, body: bytes) -> Tuple[Dict[str, str], List[Tuple[str, bytes]]]:
    """Parse multipart/form-data request body using Python standard library email.parser."""
    header_bytes = f"Content-Type: {content_type}\r\nMIME-Version: 1.0\r\n\r\n".encode("utf-8")
    msg = BytesParser(policy=default_email_policy).parsebytes(header_bytes + body)
    fields: Dict[str, str] = {}
    files: List[Tuple[str, bytes]] = []

    if msg.is_multipart():
        for part in msg.iter_parts():
            cd = part.get("Content-Disposition", "")
            if not cd:
                continue
            name_val = part.get_param("name", header="content-disposition")
            filename_val = part.get_filename()
            payload_bytes = part.get_payload(decode=True) or b""
            if filename_val:
                files.append((str(filename_val), payload_bytes))
            elif name_val:
                fields[str(name_val)] = payload_bytes.decode("utf-8", errors="replace")
    return fields, files


@router.get("", response_model=List[DocumentResponse])
def list_documents(
    company_id: Optional[int] = Query(default=None),
    assessment_period_id: Optional[int] = Query(default=None),
    category: Optional[str] = Query(default=None),
    include_archived: bool = Query(default=False),
    db: Session = Depends(get_db),
):
    q = db.query(Document)
    if company_id is not None:
        q = q.filter(Document.company_id == company_id)
    if assessment_period_id is not None:
        q = q.filter(Document.assessment_period_id == assessment_period_id)
    if category:
        q = q.filter(Document.category == category)
    if not include_archived:
        q = q.filter(Document.is_archived == False)  # noqa: E712

    docs = q.order_by(Document.id.desc()).all()
    results = []
    for d in docs:
        chunk_cnt = (
            db.query(DocumentChunk).filter(DocumentChunk.document_id == d.id).count()
        )
        resp = DocumentResponse.model_validate(d)
        resp.chunk_count = chunk_cnt
        results.append(resp)
    return results


@router.post("/upload", response_model=List[DocumentResponse], status_code=201)
async def upload_documents(
    request: Request,
    db: Session = Depends(get_db),
    user: UserContext = Depends(get_current_user),
):
    """
    Upload one or multiple company research documents (PDF, DOCX, TXT, CSV, XLSX, PPTX).
    Supports both multipart/form-data and application/json payloads.
    """
    require_write_access(user)
    content_type = request.headers.get("content-type", "")
    body = await request.body()

    uploaded_items: List[Dict[str, Any]] = []

    if "multipart/form-data" in content_type:
        fields, files = _parse_multipart_request(content_type, body)
        if not files:
            raise HTTPException(
                status_code=400, detail="No files found in multipart upload."
            )
        company_id = int(fields.get("company_id", "1"))
        assessment_period_id = int(fields.get("assessment_period_id", "1"))
        category = fields.get("category", "Annual Report / 10-K")
        financial_year = fields.get("financial_year", "FY2025")
        publication_date = fields.get("publication_date") or None
        source_url = fields.get("source_url") or None
        custom_title = fields.get("title") or None

        for idx, (fname, fbytes) in enumerate(files):
            title = (
                custom_title
                if (custom_title and len(files) == 1)
                else fname.rsplit(".", 1)[0].replace("_", " ")
            )
            uploaded_items.append(
                {
                    "company_id": company_id,
                    "assessment_period_id": assessment_period_id,
                    "title": title,
                    "category": category,
                    "financial_year": financial_year,
                    "publication_date": publication_date,
                    "source_url": source_url,
                    "file_name": fname,
                    "file_bytes": fbytes,
                    "version": fields.get("version", "1.0"),
                }
            )
    else:
        try:
            payload = json.loads(body.decode("utf-8"))
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid JSON upload payload.")

        items_raw = payload if isinstance(payload, list) else [payload]
        for item in items_raw:
            fname = item.get("file_name", "document.txt")
            if item.get("content_base64"):
                fbytes = base64.b64decode(item["content_base64"])
            elif item.get("content_text") is not None:
                fbytes = str(item["content_text"]).encode("utf-8")
            else:
                fbytes = b""

            uploaded_items.append(
                {
                    "company_id": int(item["company_id"]),
                    "assessment_period_id": int(item["assessment_period_id"]),
                    "title": item.get("title") or fname,
                    "category": item.get("category", "Annual Report / 10-K"),
                    "financial_year": item.get("financial_year", "FY2025"),
                    "publication_date": item.get("publication_date"),
                    "source_url": item.get("source_url"),
                    "file_name": fname,
                    "file_bytes": fbytes,
                    "version": item.get("version", "1.0"),
                }
            )

    responses: List[DocumentResponse] = []
    for u in uploaded_items:
        period = (
            db.query(AssessmentPeriod)
            .filter(AssessmentPeriod.id == u["assessment_period_id"])
            .first()
        )
        if not period:
            raise HTTPException(
                status_code=404,
                detail=f"AssessmentPeriod {u['assessment_period_id']} not found.",
            )

        file_type = validate_file_upload(u["file_name"], len(u["file_bytes"]))

        safe_fname = f"doc_{u['company_id']}_{u['assessment_period_id']}_{u['file_name'].replace('/', '_')}"
        save_path = settings.upload_dir / safe_fname
        save_path.write_bytes(u["file_bytes"])

        doc = Document(
            company_id=u["company_id"],
            assessment_period_id=u["assessment_period_id"],
            title=u["title"],
            category=u["category"],
            financial_year=u["financial_year"],
            publication_date=u["publication_date"],
            source_url=u["source_url"],
            file_type=file_type,
            file_path=str(save_path),
            file_size=len(u["file_bytes"]),
            version=u["version"],
            processing_status="processing",
            uploader=user.username,
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)

        doc = _process_and_index_document(db, doc, u["file_bytes"])
        chunk_cnt = (
            db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).count()
        )

        log_audit_event(
            db=db,
            action_type="UPLOAD_DOCUMENT",
            entity_type="Document",
            actor=user.username,
            role=user.role,
            company_id=doc.company_id,
            assessment_period_id=doc.assessment_period_id,
            entity_id=doc.id,
            after_state={
                "title": doc.title,
                "file_type": doc.file_type,
                "processing_status": doc.processing_status,
                "prompt_injection_flag": doc.prompt_injection_flag,
                "chunk_count": chunk_cnt,
            },
        )

        resp = DocumentResponse.model_validate(doc)
        resp.chunk_count = chunk_cnt
        responses.append(resp)

    return responses


@router.get("/search/chunks", response_model=List[Dict[str, Any]])
def search_chunks_endpoint(
    query: str = Query(..., min_length=2),
    company_id: int = Query(...),
    assessment_period_id: Optional[int] = Query(default=None),
    document_category: Optional[str] = Query(default=None),
    financial_year: Optional[str] = Query(default=None),
    top_k: int = Query(default=6, ge=1, le=25),
    db: Session = Depends(get_db),
):
    results = search_relevant_chunks(
        db=db,
        query=query,
        company_id=company_id,
        assessment_period_id=assessment_period_id,
        document_category=document_category,
        financial_year=financial_year,
        top_k=top_k,
    )
    return [
        {
            "chunk_id": ch.id,
            "document_id": ch.document_id,
            "page_number": ch.page_number,
            "section_heading": ch.section_heading,
            "content": ch.content,
            "financial_year": ch.financial_year,
            "document_category": ch.document_category,
            "source_url": ch.source_url,
            "similarity_score": score,
        }
        for ch, score in results
    ]


@router.get("/{document_id}", response_model=Dict[str, Any])
def get_document_metadata(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    chunks = (
        db.query(DocumentChunk)
        .filter(DocumentChunk.document_id == doc.id)
        .order_by(DocumentChunk.chunk_index.asc())
        .all()
    )
    resp = DocumentResponse.model_validate(doc).model_dump()
    resp["chunk_count"] = len(chunks)
    resp["chunks"] = [
        {
            "id": c.id,
            "chunk_index": c.chunk_index,
            "page_number": c.page_number,
            "section_heading": c.section_heading,
            "content": c.content,
            "token_count": c.token_count,
        }
        for c in chunks
    ]
    return resp


@router.get("/{document_id}/text", response_model=Dict[str, Any])
def get_document_extracted_text(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return {
        "document_id": doc.id,
        "title": doc.title,
        "processing_status": doc.processing_status,
        "prompt_injection_flag": doc.prompt_injection_flag,
        "extracted_text": doc.extracted_text or "",
        "error_message": doc.error_message,
    }


@router.post("/{document_id}/retry", response_model=DocumentResponse)
def retry_failed_document(
    document_id: int,
    db: Session = Depends(get_db),
    user: UserContext = Depends(get_current_user),
):
    require_write_access(user)
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    from pathlib import Path

    file_bytes = b""
    if doc.file_path and Path(doc.file_path).exists():
        file_bytes = Path(doc.file_path).read_bytes()
    elif doc.extracted_text:
        file_bytes = doc.extracted_text.encode("utf-8")

    doc = _process_and_index_document(db, doc, file_bytes)
    chunk_cnt = (
        db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).count()
    )
    resp = DocumentResponse.model_validate(doc)
    resp.chunk_count = chunk_cnt
    return resp


@router.delete("/{document_id}", response_model=Dict[str, Any])
def archive_or_delete_document(
    document_id: int,
    permanent: bool = Query(default=False),
    db: Session = Depends(get_db),
    user: UserContext = Depends(get_current_user),
):
    """
    Archive a document by default so historical documents are never accidentally overwritten
    or lost (Section 11), or permanently delete if explicitly requested.
    """
    require_write_access(user)
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    if permanent:
        db.delete(doc)
        db.commit()
        return {"status": "deleted", "document_id": document_id}

    doc.is_archived = True
    db.commit()
    return {"status": "archived", "document_id": document_id}
