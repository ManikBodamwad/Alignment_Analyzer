"""
Transparent, Rule-Based Alignment & Evidence Coverage Scoring Engine (Section 8).
Never fabricates scores; strictly computes weighted averages from assessed requirements
and excludes 'Insufficient Evidence' and 'Not Applicable' from score denominators while
tracking Evidence Coverage separately.
"""

from typing import Dict, Optional, Tuple
from sqlalchemy.orm import Session

from backend.models import (
    AlignmentAssessment,
    AssessmentPeriod,
    ScoringConfiguration,
    Stakeholder,
    StakeholderExpectation,
)


ALIGNMENT_SCORE_MAP: Dict[str, Optional[float]] = {
    "Strong Alignment": 4.0,
    "Partial Alignment": 3.0,
    "Potential Misalignment": 1.0,
    "Insufficient Evidence": None,
    "Not Applicable": None,
}


def map_classification_to_score(
    classification: str, config: Optional[ScoringConfiguration] = None
) -> Optional[float]:
    """Return numeric score (4, 3, 1, or None) for an alignment classification."""
    if config:
        if classification == "Strong Alignment":
            return float(config.strong_alignment_value)
        if classification == "Partial Alignment":
            return float(config.partial_alignment_value)
        if classification == "Potential Misalignment":
            return float(config.potential_misalignment_value)
        return None
    return ALIGNMENT_SCORE_MAP.get(classification, None)


def recalculate_assessment_scores(
    db: Session, assessment_period_id: int
) -> Dict[str, Optional[float]]:
    """
    Recalculate all stakeholder alignment scores, stakeholder evidence coverage,
    overall organizational alignment score, and overall evidence coverage for an assessment period.
    """
    period = (
        db.query(AssessmentPeriod)
        .filter(AssessmentPeriod.id == assessment_period_id)
        .first()
    )
    if not period:
        raise ValueError(f"AssessmentPeriod {assessment_period_id} not found.")

    config = (
        db.query(ScoringConfiguration)
        .filter(ScoringConfiguration.assessment_period_id == assessment_period_id)
        .first()
    )
    if not config:
        config = ScoringConfiguration(assessment_period_id=assessment_period_id)
        db.add(config)
        db.flush()

    stakeholders = (
        db.query(Stakeholder)
        .filter(Stakeholder.assessment_period_id == assessment_period_id)
        .all()
    )
    expectations = (
        db.query(StakeholderExpectation)
        .filter(StakeholderExpectation.assessment_period_id == assessment_period_id)
        .all()
    )
    exp_weight_map = {exp.id: float(exp.requirement_weight) for exp in expectations}

    assessments = (
        db.query(AlignmentAssessment)
        .filter(AlignmentAssessment.assessment_period_id == assessment_period_id)
        .all()
    )

    # Sync numeric scores and requirement weights on individual alignment assessments
    for aa in assessments:
        aa.requirement_weight = exp_weight_map.get(aa.expectation_id, aa.requirement_weight or 1.0)
        aa.numeric_score = map_classification_to_score(aa.classification, config)

    total_applicable_count = 0
    total_assessed_count = 0

    weighted_stakeholder_sum = 0.0
    applicable_stakeholder_weight_sum = 0.0

    for sh in stakeholders:
        sh_assessments = [a for a in assessments if a.stakeholder_id == sh.id]
        applicable = [a for a in sh_assessments if a.classification != "Not Applicable"]
        assessed = [
            a
            for a in applicable
            if a.classification in {"Strong Alignment", "Partial Alignment", "Potential Misalignment"}
            and a.numeric_score is not None
        ]

        sh_app_count = len(applicable)
        sh_ass_count = len(assessed)
        total_applicable_count += sh_app_count
        total_assessed_count += sh_ass_count

        if sh_app_count > 0:
            sh.evidence_coverage_pct = round((sh_ass_count / sh_app_count) * 100.0, 1)
        else:
            sh.evidence_coverage_pct = 0.0

        if sh_ass_count >= config.min_evidence_threshold:
            req_weighted_sum = sum(
                float(a.numeric_score) * float(a.requirement_weight)
                for a in assessed
                if a.numeric_score is not None
            )
            req_weight_total = sum(float(a.requirement_weight) for a in assessed)
            if req_weight_total > 0:
                weighted_avg = req_weighted_sum / req_weight_total
                max_val = float(config.strong_alignment_value) or 4.0
                sh_pct = round((weighted_avg / max_val) * 100.0, 1)
                sh.alignment_score = sh_pct
                weighted_stakeholder_sum += sh_pct * float(sh.importance_weight)
                applicable_stakeholder_weight_sum += float(sh.importance_weight)
            else:
                sh.alignment_score = None
        else:
            sh.alignment_score = None

    if total_applicable_count > 0:
        period.evidence_coverage_pct = round(
            (total_assessed_count / total_applicable_count) * 100.0, 1
        )
    else:
        period.evidence_coverage_pct = 0.0

    if applicable_stakeholder_weight_sum > 0:
        period.overall_alignment_score = round(
            weighted_stakeholder_sum / applicable_stakeholder_weight_sum, 1
        )
    else:
        period.overall_alignment_score = None

    db.commit()
    return {
        "overall_alignment_score": period.overall_alignment_score,
        "evidence_coverage_pct": period.evidence_coverage_pct,
        "total_applicable_requirements": float(total_applicable_count),
        "total_assessed_requirements": float(total_assessed_count),
    }

