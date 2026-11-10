"""Assessments REST API Router."""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import (
    AlignmentAssessment,
    AssessmentPeriod,
    Company,
    Document,
    EvidenceRecord,
    OrganizationalDimension,
    OrganizationalUnit,
    Recommendation,
    Stakeholder,
    StakeholderConflict,
)
from backend.schemas import AssessmentCreate, AssessmentResponse, AssessmentUpdate
from backend.security import (
    UserContext,
    get_current_user,
    log_audit_event,
    require_write_access,
)
from backend.services.analysis_engine import (
    ensure_baseline_framework,
    run_full_diagnostic_analysis,
)
from backend.services.comparison_engine import compare_two_assessments
from backend.services.scoring_engine import recalculate_assessment_scores

router = APIRouter(prefix="/api/assessments", tags=["Assessments"])


@router.get("", response_model=List[AssessmentResponse])
def list_assessments(
    company_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
):
    q = db.query(AssessmentPeriod)
    if company_id is not None:
        q = q.filter(AssessmentPeriod.company_id == company_id)
    return q.order_by(AssessmentPeriod.id.asc()).all()


@router.post("", response_model=AssessmentResponse, status_code=201)
def create_assessment(
    payload: AssessmentCreate,
    db: Session = Depends(get_db),
    user: UserContext = Depends(get_current_user),
):
    require_write_access(user)
    company = db.query(Company).filter(Company.id == payload.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found.")

    period = AssessmentPeriod(
        company_id=payload.company_id,
        title=payload.title,
        fiscal_year=payload.fiscal_year,
        start_date=payload.start_date,
        end_date=payload.end_date,
        status="draft",
        created_by=payload.created_by or user.username,
    )
    db.add(period)
    db.commit()
    db.refresh(period)

    if payload.seed_baseline_framework:
        ensure_baseline_framework(db, period)
        run_full_diagnostic_analysis(db, period.id)
        db.refresh(period)

    log_audit_event(
        db=db,
        action_type="CREATE_ASSESSMENT",
        entity_type="AssessmentPeriod",
        actor=user.username,
        role=user.role,
        company_id=period.company_id,
        assessment_period_id=period.id,
        entity_id=period.id,
        after_state={"title": period.title, "fiscal_year": period.fiscal_year},
    )
    return period


@router.get("/compare", response_model=Dict[str, Any])
def compare_assessments_endpoint(
    base_id: int = Query(..., description="Baseline AssessmentPeriod ID"),
    target_id: int = Query(..., description="Target AssessmentPeriod ID"),
    db: Session = Depends(get_db),
):
    try:
        return compare_two_assessments(db, base_id, target_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/{assessment_id}", response_model=Dict[str, Any])
def get_assessment_full_summary(
    assessment_id: int,
    db: Session = Depends(get_db),
):
    period = (
        db.query(AssessmentPeriod)
        .filter(AssessmentPeriod.id == assessment_id)
        .first()
    )
    if not period:
        raise HTTPException(status_code=404, detail="Assessment period not found.")

    company = db.query(Company).filter(Company.id == period.company_id).first()
    docs = (
        db.query(Document)
        .filter(
            Document.assessment_period_id == period.id,
            Document.is_archived == False,  # noqa: E712
        )
        .all()
    )
    stakeholders = (
        db.query(Stakeholder)
        .filter(Stakeholder.assessment_period_id == period.id)
        .all()
    )
    dimensions = (
        db.query(OrganizationalDimension)
        .filter(OrganizationalDimension.assessment_period_id == period.id)
        .all()
    )
    units = (
        db.query(OrganizationalUnit)
        .filter(OrganizationalUnit.assessment_period_id == period.id)
        .all()
    )
    assessments = (
        db.query(AlignmentAssessment)
        .filter(AlignmentAssessment.assessment_period_id == period.id)
        .all()
    )
    conflicts = (
        db.query(StakeholderConflict)
        .filter(StakeholderConflict.assessment_period_id == period.id)
        .all()
    )
    recommendations = (
        db.query(Recommendation)
        .filter(Recommendation.assessment_period_id == period.id)
        .all()
    )
    evidence_count = (
        db.query(EvidenceRecord)
        .filter(EvidenceRecord.assessment_period_id == period.id)
        .count()
    )

    strong_count = sum(1 for a in assessments if a.classification == "Strong Alignment")
    partial_count = sum(1 for a in assessments if a.classification == "Partial Alignment")
    misaligned_count = sum(
        1 for a in assessments if a.classification == "Potential Misalignment"
    )
    insufficient_count = sum(
        1 for a in assessments if a.classification == "Insufficient Evidence"
    )
    assessed_sh_count = sum(1 for s in stakeholders if s.alignment_score is not None)

    return {
        "assessment": {
            "id": period.id,
            "company_id": period.company_id,
            "company_name": company.name if company else "",
            "company_ticker": company.ticker if company else "",
            "company_priorities": company.analysis_priorities if company else [],
            "title": period.title,
            "fiscal_year": period.fiscal_year,
            "status": period.status,
            "is_locked": period.is_locked,
            "version": period.version,
            "overall_alignment_score": period.overall_alignment_score,
            "evidence_coverage_pct": period.evidence_coverage_pct,
            "last_analyzed_at": period.last_analyzed_at.isoformat()
            if period.last_analyzed_at
            else None,
            "created_at": period.created_at.isoformat(),
        },
        "metrics": {
            "documents_processed": len(
                [d for d in docs if d.processing_status == "completed"]
            ),
            "total_documents": len(docs),
            "stakeholders_assessed": assessed_sh_count,
            "total_stakeholders": len(stakeholders),
            "alignment_gaps_identified": partial_count + misaligned_count,
            "potential_misalignments": misaligned_count,
            "partial_alignments": partial_count,
            "strong_alignments": strong_count,
            "insufficient_evidence_count": insufficient_count,
            "recommendations_count": len(recommendations),
            "conflicts_count": len(conflicts),
            "evidence_records_count": evidence_count,
            "organizational_units_count": len(units),
        },
        "dimensions_summary": [
            {
                "id": d.id,
                "dimension_code": d.dimension_code,
                "dimension_name": d.dimension_name,
                "suitability_classification": d.suitability_classification,
                "evidence_count": d.evidence_count,
                "confidence_level": d.confidence_level,
            }
            for d in dimensions
        ],
    }


@router.put("/{assessment_id}", response_model=AssessmentResponse)
def update_assessment(
    assessment_id: int,
    payload: AssessmentUpdate,
    db: Session = Depends(get_db),
    user: UserContext = Depends(get_current_user),
):
    require_write_access(user)
    period = (
        db.query(AssessmentPeriod)
        .filter(AssessmentPeriod.id == assessment_id)
        .first()
    )
    if not period:
        raise HTTPException(status_code=404, detail="Assessment period not found.")

    if period.is_locked and payload.is_locked is not False:
        raise HTTPException(
            status_code=400,
            detail="Assessment is locked for historical immutability. Unlock or create a revised version first.",
        )

    if payload.title is not None:
        period.title = payload.title
    if payload.fiscal_year is not None:
        period.fiscal_year = payload.fiscal_year
    if payload.start_date is not None:
        period.start_date = payload.start_date
    if payload.end_date is not None:
        period.end_date = payload.end_date
    if payload.status is not None:
        period.status = payload.status
    if payload.is_locked is not None:
        period.is_locked = payload.is_locked

    db.commit()
    db.refresh(period)
    return period


@router.post("/{assessment_id}/run-analysis", response_model=Dict[str, Any])
def run_assessment_analysis_endpoint(
    assessment_id: int,
    db: Session = Depends(get_db),
    user: UserContext = Depends(get_current_user),
):
    require_write_access(user)
    period = (
        db.query(AssessmentPeriod)
        .filter(AssessmentPeriod.id == assessment_id)
        .first()
    )
    if not period:
        raise HTTPException(status_code=404, detail="Assessment period not found.")
    if period.is_locked:
        raise HTTPException(
            status_code=400,
            detail="Cannot re-analyze a locked historical assessment.",
        )

    result = run_full_diagnostic_analysis(db, period.id)
    log_audit_event(
        db=db,
        action_type="RUN_DIAGNOSTIC_ANALYSIS",
        entity_type="AssessmentPeriod",
        actor=user.username,
        role=user.role,
        company_id=period.company_id,
        assessment_period_id=period.id,
        entity_id=period.id,
        after_state=result,
    )
    return result


@router.post("/{assessment_id}/recalculate-scores", response_model=Dict[str, Any])
def recalculate_scores_endpoint(
    assessment_id: int,
    db: Session = Depends(get_db),
    user: UserContext = Depends(get_current_user),
):
    require_write_access(user)
    try:
        scores = recalculate_assessment_scores(db, assessment_id)
        log_audit_event(
            db=db,
            action_type="RECALCULATE_SCORES",
            entity_type="AssessmentPeriod",
            actor=user.username,
            role=user.role,
            assessment_period_id=assessment_id,
            entity_id=assessment_id,
            after_state=scores,
        )
        return scores
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

