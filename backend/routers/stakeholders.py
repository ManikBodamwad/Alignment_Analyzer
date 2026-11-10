"""Stakeholders & Expectations REST API Router."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import (
    AlignmentAssessment,
    Stakeholder,
    StakeholderExpectation,
)
from backend.schemas import (
    ExpectationResponse,
    ExpectationWeightUpdate,
    StakeholderResponse,
    StakeholderWeightUpdate,
)
from backend.security import (
    UserContext,
    get_current_user,
    log_audit_event,
    require_write_access,
)
from backend.services.scoring_engine import recalculate_assessment_scores

router = APIRouter(prefix="/api/stakeholders", tags=["Stakeholders"])


def _enrich_stakeholder_response(
    db: Session, sh: Stakeholder
) -> StakeholderResponse:
    assessments = (
        db.query(AlignmentAssessment)
        .filter(AlignmentAssessment.stakeholder_id == sh.id)
        .all()
    )
    resp = StakeholderResponse.model_validate(sh)
    resp.strong_count = sum(
        1 for a in assessments if a.classification == "Strong Alignment"
    )
    resp.partial_count = sum(
        1 for a in assessments if a.classification == "Partial Alignment"
    )
    resp.misalignment_count = sum(
        1 for a in assessments if a.classification == "Potential Misalignment"
    )
    resp.insufficient_count = sum(
        1 for a in assessments if a.classification == "Insufficient Evidence"
    )
    return resp


@router.get("", response_model=List[StakeholderResponse])
def list_stakeholders(
    assessment_period_id: int = Query(...),
    category: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    q = db.query(Stakeholder).filter(
        Stakeholder.assessment_period_id == assessment_period_id
    )
    if category:
        q = q.filter(Stakeholder.category == category)
    stakeholders = q.order_by(Stakeholder.id.asc()).all()
    return [_enrich_stakeholder_response(db, sh) for sh in stakeholders]


@router.get("/{stakeholder_id}", response_model=StakeholderResponse)
def get_stakeholder_profile(
    stakeholder_id: int, db: Session = Depends(get_db)
):
    sh = db.query(Stakeholder).filter(Stakeholder.id == stakeholder_id).first()
    if not sh:
        raise HTTPException(status_code=404, detail="Stakeholder not found.")
    return _enrich_stakeholder_response(db, sh)


@router.get(
    "/{stakeholder_id}/expectations", response_model=List[ExpectationResponse]
)
def get_stakeholder_expectations(
    stakeholder_id: int, db: Session = Depends(get_db)
):
    return (
        db.query(StakeholderExpectation)
        .filter(StakeholderExpectation.stakeholder_id == stakeholder_id)
        .order_by(StakeholderExpectation.id.asc())
        .all()
    )


@router.put("/{stakeholder_id}/weight", response_model=StakeholderResponse)
def update_stakeholder_weight(
    stakeholder_id: int,
    payload: StakeholderWeightUpdate,
    db: Session = Depends(get_db),
    user: UserContext = Depends(get_current_user),
):
    require_write_access(user)
    sh = db.query(Stakeholder).filter(Stakeholder.id == stakeholder_id).first()
    if not sh:
        raise HTTPException(status_code=404, detail="Stakeholder not found.")

    before = {
        "importance_weight": sh.importance_weight,
        "influence_level": sh.influence_level,
        "dependence_level": sh.dependence_level,
    }
    sh.importance_weight = payload.importance_weight
    if payload.influence_level:
        sh.influence_level = payload.influence_level
    if payload.dependence_level:
        sh.dependence_level = payload.dependence_level

    db.commit()
    recalculate_assessment_scores(db, sh.assessment_period_id)
    db.refresh(sh)

    log_audit_event(
        db=db,
        action_type="UPDATE_STAKEHOLDER_WEIGHT",
        entity_type="Stakeholder",
        actor=payload.actor or user.username,
        role=user.role,
        company_id=sh.company_id,
        assessment_period_id=sh.assessment_period_id,
        entity_id=sh.id,
        before_state=before,
        after_state={
            "importance_weight": sh.importance_weight,
            "influence_level": sh.influence_level,
            "dependence_level": sh.dependence_level,
            "new_alignment_score": sh.alignment_score,
        },
        justification=payload.justification,
    )
    return _enrich_stakeholder_response(db, sh)


@router.put(
    "/expectations/{expectation_id}/weight", response_model=ExpectationResponse
)
def update_expectation_weight(
    expectation_id: int,
    payload: ExpectationWeightUpdate,
    db: Session = Depends(get_db),
    user: UserContext = Depends(get_current_user),
):
    require_write_access(user)
    exp = (
        db.query(StakeholderExpectation)
        .filter(StakeholderExpectation.id == expectation_id)
        .first()
    )
    if not exp:
        raise HTTPException(status_code=404, detail="Expectation not found.")

    before = {"requirement_weight": exp.requirement_weight}
    exp.requirement_weight = payload.requirement_weight
    db.commit()
    recalculate_assessment_scores(db, exp.assessment_period_id)
    db.refresh(exp)

    log_audit_event(
        db=db,
        action_type="UPDATE_REQUIREMENT_WEIGHT",
        entity_type="StakeholderExpectation",
        actor=payload.actor or user.username,
        role=user.role,
        assessment_period_id=exp.assessment_period_id,
        entity_id=exp.id,
        before_state=before,
        after_state={"requirement_weight": exp.requirement_weight},
        justification=payload.justification,
    )
    return exp

