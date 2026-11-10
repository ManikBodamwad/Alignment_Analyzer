"""Evidence Repository REST API Router."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import EvidenceRecord
from backend.schemas import EvidenceResponse

router = APIRouter(prefix="/api/evidence", tags=["Evidence"])


@router.get("", response_model=List[EvidenceResponse])
def list_evidence(
    company_id: Optional[int] = Query(default=None),
    assessment_period_id: Optional[int] = Query(default=None),
    stakeholder_id: Optional[int] = Query(default=None),
    document_id: Optional[int] = Query(default=None),
    organizational_dimension: Optional[str] = Query(default=None),
    evidence_classification: Optional[str] = Query(default=None),
    is_contradictory: Optional[bool] = Query(default=None),
    limit: int = Query(default=200, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    q = db.query(EvidenceRecord)
    if company_id is not None:
        q = q.filter(EvidenceRecord.company_id == company_id)
    if assessment_period_id is not None:
        q = q.filter(EvidenceRecord.assessment_period_id == assessment_period_id)
    if stakeholder_id is not None:
        q = q.filter(EvidenceRecord.stakeholder_id == stakeholder_id)
    if document_id is not None:
        q = q.filter(EvidenceRecord.document_id == document_id)
    if organizational_dimension:
        q = q.filter(
            EvidenceRecord.organizational_dimension == organizational_dimension
        )
    if evidence_classification:
        q = q.filter(
            EvidenceRecord.evidence_classification == evidence_classification
        )
    if is_contradictory is not None:
        q = q.filter(EvidenceRecord.is_contradictory == is_contradictory)

    return (
        q.order_by(EvidenceRecord.id.asc()).offset(offset).limit(limit).all()
    )


@router.get("/{evidence_id}", response_model=EvidenceResponse)
def get_evidence_record(evidence_id: int, db: Session = Depends(get_db)):
    ev = (
        db.query(EvidenceRecord)
        .filter(EvidenceRecord.id == evidence_id)
        .first()
    )
    if not ev:
        raise HTTPException(status_code=404, detail="Evidence record not found.")
    return ev

