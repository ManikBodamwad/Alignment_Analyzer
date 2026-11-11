"""Analysis, Alignment Matrix, Overrides, Conflicts, Recommendations & Audit REST API Router."""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Body, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.config import settings
from backend.database import create_database_backup, get_db
from backend.models import (
    AlignmentAssessment,
    AssessmentPeriod,
    AuditLog,
    Company,
    EvidenceRecord,
    ManualOverride,
    OrganizationalDimension,
    OrganizationalUnit,
    Recommendation,
    Stakeholder,
    StakeholderConflict,
    StakeholderExpectation,
)
from backend.schemas import (
    ManualOverrideRequest,
    OrganizationalDimensionResponse,
    OrganizationalUnitResponse,
    RecommendationResponse,
    RecommendationStatusUpdate,
    StakeholderConflictResponse,
)
from backend.security import (
    UserContext,
    get_current_user,
    log_audit_event,
    require_write_access,
)
from backend.services.analysis_engine import run_full_diagnostic_analysis
from backend.services.llm_provider import generate_ai_executive_synthesis
from backend.services.prompts import PROMPT_REGISTRY
from backend.services.scoring_engine import (
    map_classification_to_score,
    recalculate_assessment_scores,
)

router = APIRouter(prefix="/api/analysis", tags=["Analysis & Diagnostics"])


@router.get("/llm-config", response_model=Dict[str, Any])
def get_llm_config():
    """Return active LLM provider configuration and masked Groq API status."""
    key = settings.groq_api_key or ""
    masked = f"{key[:7]}...{key[-4:]}" if len(key) > 12 else ("Configured" if key else "Not Configured")
    return {
        "llm_provider": settings.llm_provider,
        "llm_model": settings.llm_model,
        "groq_configured": bool(settings.groq_api_key),
        "masked_groq_key": masked,
    }


@router.post("/llm-config", response_model=Dict[str, Any])
def update_llm_config(
    payload: Dict[str, Any] = Body(...),
    user: UserContext = Depends(get_current_user),
):
    """Update runtime LLM provider settings (e.g., Groq API key and model)."""
    require_write_access(user)
    if "groq_api_key" in payload and payload["groq_api_key"]:
        settings.groq_api_key = str(payload["groq_api_key"]).strip()
        settings.llm_provider = "groq"
    if "llm_provider" in payload and payload["llm_provider"]:
        settings.llm_provider = str(payload["llm_provider"]).strip()
    if "llm_model" in payload and payload["llm_model"]:
        settings.llm_model = str(payload["llm_model"]).strip()
    return get_llm_config()


@router.post("/{assessment_id}/ai-synthesize", response_model=Dict[str, Any])
def run_ai_executive_synthesis_endpoint(
    assessment_id: int,
    payload: Optional[Dict[str, Any]] = Body(default=None),
    db: Session = Depends(get_db),
):
    """Run live Groq AI executive diagnostic synthesis and Q&A grounded in assessment evidence."""
    period = (
        db.query(AssessmentPeriod)
        .filter(AssessmentPeriod.id == assessment_id)
        .first()
    )
    if not period:
        raise HTTPException(status_code=404, detail="Assessment period not found.")
    company = db.query(Company).filter(Company.id == period.company_id).first()
    evidence = (
        db.query(EvidenceRecord)
        .filter(EvidenceRecord.assessment_period_id == assessment_id)
        .order_by(EvidenceRecord.quality_score.desc())
        .all()
    )
    assessments = (
        db.query(AlignmentAssessment)
        .filter(AlignmentAssessment.assessment_period_id == assessment_id)
        .all()
    )
    ev_items = [
        {
            "id": e.id,
            "dimension": e.organizational_dimension,
            "classification": e.evidence_classification,
            "document_name": e.document_name,
            "page_number": e.page_number,
            "section_heading": e.section_heading,
            "exact_quotation": e.exact_quotation,
        }
        for e in evidence
    ]
    gap_items = [
        {
            "dimension": a.organizational_dimension,
            "classification": a.classification,
            "rationale": a.rationale,
            "root_causes": a.root_cause_diagnosis,
        }
        for a in assessments
        if a.classification in ("Potential Misalignment", "Partial Alignment", "Insufficient Evidence")
    ]
    custom_q = (payload or {}).get("question")
    return generate_ai_executive_synthesis(
        company_name=company.name if company else "Organization",
        period_title=period.title,
        overall_score=period.overall_alignment_score,
        coverage_pct=period.evidence_coverage_pct,
        evidence_items=ev_items,
        gap_items=gap_items,
        custom_question=custom_q,
    )


@router.get("/prompts", response_model=Dict[str, str])
def get_system_prompts():
    """Return the 10 dedicated system prompts used across the AI diagnostic stages."""
    return PROMPT_REGISTRY


@router.get("/{assessment_id}/structure", response_model=Dict[str, Any])
def get_organizational_structure(
    assessment_id: int, db: Session = Depends(get_db)
):
    dimensions = (
        db.query(OrganizationalDimension)
        .filter(OrganizationalDimension.assessment_period_id == assessment_id)
        .order_by(OrganizationalDimension.id.asc())
        .all()
    )
    units = (
        db.query(OrganizationalUnit)
        .filter(OrganizationalUnit.assessment_period_id == assessment_id)
        .order_by(OrganizationalUnit.id.asc())
        .all()
    )
    evidence = (
        db.query(EvidenceRecord)
        .filter(EvidenceRecord.assessment_period_id == assessment_id)
        .all()
    )
    return {
        "dimensions": [
            OrganizationalDimensionResponse.model_validate(d).model_dump()
            for d in dimensions
        ],
        "units": [
            OrganizationalUnitResponse.model_validate(u).model_dump()
            for u in units
        ],
        "evidence_by_dimension": {
            d.dimension_code: [
                {
                    "id": e.id,
                    "extracted_statement": e.extracted_statement,
                    "exact_quotation": e.exact_quotation,
                    "document_name": e.document_name,
                    "page_number": e.page_number,
                    "section_heading": e.section_heading,
                    "evidence_classification": e.evidence_classification,
                    "quality_score": e.quality_score,
                }
                for e in evidence
                if e.organizational_dimension == d.dimension_code
            ]
            for d in dimensions
        },
    }


@router.get("/{assessment_id}/alignment-matrix", response_model=Dict[str, Any])
def get_alignment_matrix(assessment_id: int, db: Session = Depends(get_db)):
    stakeholders = (
        db.query(Stakeholder)
        .filter(Stakeholder.assessment_period_id == assessment_id)
        .order_by(Stakeholder.id.asc())
        .all()
    )
    expectations = {
        e.id: e
        for e in db.query(StakeholderExpectation)
        .filter(StakeholderExpectation.assessment_period_id == assessment_id)
        .all()
    }
    dimensions = (
        db.query(OrganizationalDimension)
        .filter(OrganizationalDimension.assessment_period_id == assessment_id)
        .order_by(OrganizationalDimension.id.asc())
        .all()
    )
    assessments = (
        db.query(AlignmentAssessment)
        .filter(AlignmentAssessment.assessment_period_id == assessment_id)
        .order_by(AlignmentAssessment.id.asc())
        .all()
    )
    evidence_map = {
        e.id: e
        for e in db.query(EvidenceRecord)
        .filter(EvidenceRecord.assessment_period_id == assessment_id)
        .all()
    }
    recs_by_aa: Dict[int, List[Dict[str, Any]]] = {}
    for r in (
        db.query(Recommendation)
        .filter(Recommendation.assessment_period_id == assessment_id)
        .all()
    ):
        if r.alignment_assessment_id:
            recs_by_aa.setdefault(r.alignment_assessment_id, []).append(
                RecommendationResponse.model_validate(r).model_dump()
            )

    sh_map = {s.id: s for s in stakeholders}

    detailed_assessments = []
    for a in assessments:
        exp = expectations.get(a.expectation_id)
        sh = sh_map.get(a.stakeholder_id)
        linked_ev = [
            {
                "id": evidence_map[eid].id,
                "extracted_statement": evidence_map[eid].extracted_statement,
                "exact_quotation": evidence_map[eid].exact_quotation,
                "document_name": evidence_map[eid].document_name,
                "page_number": evidence_map[eid].page_number,
                "section_heading": evidence_map[eid].section_heading,
                "source_url": evidence_map[eid].source_url,
                "publication_date": evidence_map[eid].publication_date,
                "financial_year": evidence_map[eid].financial_year,
                "evidence_classification": evidence_map[eid].evidence_classification,
                "confidence_level": evidence_map[eid].confidence_level,
                "quality_score": evidence_map[eid].quality_score,
                "quality_breakdown": evidence_map[eid].quality_breakdown,
                "is_contradictory": evidence_map[eid].is_contradictory,
            }
            for eid in (a.evidence_ids or [])
            if eid in evidence_map
        ]

        detailed_assessments.append(
            {
                "id": a.id,
                "stakeholder_id": a.stakeholder_id,
                "stakeholder_name": sh.name if sh else "",
                "stakeholder_category": sh.category if sh else "",
                "expectation_id": a.expectation_id,
                "expectation_title": exp.title if exp else "",
                "expectation_description": exp.description if exp else "",
                "is_discovered_from_docs": exp.is_discovered_from_docs if exp else False,
                "organizational_dimension": a.organizational_dimension,
                "mapped_mechanisms": a.mapped_mechanisms,
                "classification": a.classification,
                "numeric_score": a.numeric_score,
                "requirement_weight": a.requirement_weight,
                "rationale": a.rationale,
                "root_cause_diagnosis": a.root_cause_diagnosis,
                "evidence_ids": a.evidence_ids,
                "evidence_records": linked_ev,
                "evidence_quality_score": a.evidence_quality_score,
                "is_overridden": a.is_overridden,
                "recommendations": recs_by_aa.get(a.id, []),
            }
        )

    return {
        "stakeholders": [
            {
                "id": s.id,
                "name": s.name,
                "category": s.category,
                "slug": s.slug,
                "importance_weight": s.importance_weight,
                "alignment_score": s.alignment_score,
                "evidence_coverage_pct": s.evidence_coverage_pct,
            }
            for s in stakeholders
        ],
        "dimensions": [
            {
                "code": d.dimension_code,
                "name": d.dimension_name,
                "suitability_classification": d.suitability_classification,
            }
            for d in dimensions
        ],
        "assessments": detailed_assessments,
    }


@router.post("/alignments/{alignment_id}/override", response_model=Dict[str, Any])
def override_alignment_classification(
    alignment_id: int,
    payload: ManualOverrideRequest,
    db: Session = Depends(get_db),
    user: UserContext = Depends(get_current_user),
):
    """
    Allow evaluator to override an AI-generated alignment classification with
    mandatory justification, recording a ManualOverride and AuditLog and recalculating scores.
    """
    require_write_access(user)
    aa = (
        db.query(AlignmentAssessment)
        .filter(AlignmentAssessment.id == alignment_id)
        .first()
    )
    if not aa:
        raise HTTPException(
            status_code=404, detail="Alignment assessment record not found."
        )

    prev_class = aa.classification
    prev_score = aa.numeric_score
    new_score = map_classification_to_score(payload.new_classification)

    override_rec = ManualOverride(
        assessment_period_id=aa.assessment_period_id,
        alignment_assessment_id=aa.id,
        previous_classification=prev_class,
        new_classification=payload.new_classification,
        previous_score=prev_score,
        new_score=new_score,
        justification=payload.justification,
        evaluator_name=payload.evaluator_name or user.username,
        evaluator_role=payload.evaluator_role or user.role,
    )
    db.add(override_rec)

    aa.classification = payload.new_classification
    aa.numeric_score = new_score
    aa.is_overridden = True
    aa.rationale = (
        f"[MANUAL OVERRIDE by {override_rec.evaluator_name}: {payload.justification}] "
        + aa.rationale
    )
    db.commit()

    scores = recalculate_assessment_scores(db, aa.assessment_period_id)

    log_audit_event(
        db=db,
        action_type="MANUAL_OVERRIDE_ALIGNMENT",
        entity_type="AlignmentAssessment",
        actor=override_rec.evaluator_name,
        role=override_rec.evaluator_role,
        assessment_period_id=aa.assessment_period_id,
        entity_id=aa.id,
        before_state={
            "classification": prev_class,
            "numeric_score": prev_score,
        },
        after_state={
            "classification": payload.new_classification,
            "numeric_score": new_score,
            "updated_period_scores": scores,
        },
        justification=payload.justification,
    )

    return {
        "alignment_id": aa.id,
        "previous_classification": prev_class,
        "new_classification": aa.classification,
        "new_numeric_score": aa.numeric_score,
        "justification": payload.justification,
        "recalculated_scores": scores,
    }


@router.get(
    "/{assessment_id}/conflicts",
    response_model=List[StakeholderConflictResponse],
)
def list_stakeholder_conflicts(
    assessment_id: int, db: Session = Depends(get_db)
):
    return (
        db.query(StakeholderConflict)
        .filter(StakeholderConflict.assessment_period_id == assessment_id)
        .order_by(StakeholderConflict.id.asc())
        .all()
    )


@router.get(
    "/{assessment_id}/recommendations",
    response_model=List[RecommendationResponse],
)
def list_recommendations(
    assessment_id: int,
    priority: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    q = db.query(Recommendation).filter(
        Recommendation.assessment_period_id == assessment_id
    )
    if priority:
        q = q.filter(Recommendation.priority == priority)
    if status:
        q = q.filter(Recommendation.status == status)
    return q.order_by(Recommendation.id.asc()).all()


@router.put(
    "/recommendations/{recommendation_id}/status",
    response_model=RecommendationResponse,
)
def update_recommendation_status(
    recommendation_id: int,
    payload: RecommendationStatusUpdate,
    db: Session = Depends(get_db),
    user: UserContext = Depends(get_current_user),
):
    require_write_access(user)
    rec = (
        db.query(Recommendation)
        .filter(Recommendation.id == recommendation_id)
        .first()
    )
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found.")

    before = {"status": rec.status}
    rec.status = payload.status
    db.commit()
    db.refresh(rec)

    log_audit_event(
        db=db,
        action_type="UPDATE_RECOMMENDATION_STATUS",
        entity_type="Recommendation",
        actor=payload.actor or user.username,
        role=user.role,
        assessment_period_id=rec.assessment_period_id,
        entity_id=rec.id,
        before_state=before,
        after_state={"status": rec.status},
        justification=payload.justification,
    )
    return rec


@router.get("/{assessment_id}/audit-logs", response_model=List[Dict[str, Any]])
def list_audit_logs(assessment_id: int, db: Session = Depends(get_db)):
    logs = (
        db.query(AuditLog)
        .filter(AuditLog.assessment_period_id == assessment_id)
        .order_by(AuditLog.id.desc())
        .limit(100)
        .all()
    )
    overrides = (
        db.query(ManualOverride)
        .filter(ManualOverride.assessment_period_id == assessment_id)
        .order_by(ManualOverride.id.desc())
        .all()
    )
    return [
        {
            "id": l.id,
            "actor": l.actor,
            "role": l.role,
            "action_type": l.action_type,
            "entity_type": l.entity_type,
            "entity_id": l.entity_id,
            "before_state": l.before_state,
            "after_state": l.after_state,
            "justification": l.justification,
            "created_at": l.created_at.isoformat(),
            "overrides_count": len(overrides),
        }
        for l in logs
    ]


@router.post("/backup", response_model=Dict[str, str])
def trigger_database_backup(
    user: UserContext = Depends(get_current_user),
):
    require_write_access(user)
    path = create_database_backup()
    return {"status": "backup_created", "backup_path": path}


# Granular stage endpoints (Section 16: Analysis API requirements)
@router.post("/{assessment_id}/stakeholder-extraction", response_model=Dict[str, Any])
@router.post("/{assessment_id}/structure-extraction", response_model=Dict[str, Any])
@router.post("/{assessment_id}/alignment-assessment", response_model=Dict[str, Any])
@router.post("/{assessment_id}/conflict-analysis", response_model=Dict[str, Any])
@router.post("/{assessment_id}/generate-recommendations", response_model=Dict[str, Any])
def run_analysis_stage_endpoint(
    assessment_id: int,
    db: Session = Depends(get_db),
    user: UserContext = Depends(get_current_user),
):
    require_write_access(user)
    return run_full_diagnostic_analysis(db, assessment_id)

