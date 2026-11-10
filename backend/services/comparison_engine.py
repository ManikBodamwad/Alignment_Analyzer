"""
Periodic Historical Assessment & Cross-Company Comparison Engine (Section 11).
Identifies structural shifts, alignment improvements/deteriorations, evidence coverage deltas,
new capabilities, discontinued policies, and document date-difference advisories.
"""

from typing import Any, Dict, List
from sqlalchemy.orm import Session

from backend.models import (
    AlignmentAssessment,
    AssessmentPeriod,
    Company,
    Document,
    OrganizationalDimension,
    OrganizationalUnit,
    Stakeholder,
    StakeholderExpectation,
)


def compare_two_assessments(
    db: Session, base_period_id: int, target_period_id: int
) -> Dict[str, Any]:
    """
    Compare a baseline AssessmentPeriod (e.g. FY2024 or Company A) with a target
    AssessmentPeriod (e.g. FY2025 or Company B).
    """
    base_period = (
        db.query(AssessmentPeriod)
        .filter(AssessmentPeriod.id == base_period_id)
        .first()
    )
    target_period = (
        db.query(AssessmentPeriod)
        .filter(AssessmentPeriod.id == target_period_id)
        .first()
    )
    if not base_period or not target_period:
        raise ValueError("Both baseline and target assessment periods must exist.")

    base_company = db.query(Company).filter(Company.id == base_period.company_id).first()
    target_company = db.query(Company).filter(Company.id == target_period.company_id).first()

    # Check document fiscal year / publication date differences (Section 11 requirement)
    base_docs = (
        db.query(Document)
        .filter(Document.assessment_period_id == base_period.id, Document.is_archived == False)  # noqa: E712
        .all()
    )
    target_docs = (
        db.query(Document)
        .filter(Document.assessment_period_id == target_period.id, Document.is_archived == False)  # noqa: E712
        .all()
    )

    date_warnings: List[str] = []
    if base_period.fiscal_year != target_period.fiscal_year:
        date_warnings.append(
            f"Period Comparison Notice: Comparing {base_period.fiscal_year} ({base_period.title}) "
            f"with {target_period.fiscal_year} ({target_period.title})."
        )

    for d in base_docs:
        if d.financial_year != base_period.fiscal_year:
            date_warnings.append(
                f"Document Date Mismatch in Baseline: '{d.title}' is dated {d.financial_year} "
                f"(pub: {d.publication_date or 'N/A'}) within {base_period.fiscal_year} assessment."
            )
    for d in target_docs:
        if d.financial_year != target_period.fiscal_year:
            date_warnings.append(
                f"Document Date Mismatch in Target: '{d.title}' is dated {d.financial_year} "
                f"(pub: {d.publication_date or 'N/A'}) within {target_period.fiscal_year} assessment."
            )

    # Compare Stakeholder Alignment & Coverage
    base_sh = {
        s.slug: s
        for s in db.query(Stakeholder)
        .filter(Stakeholder.assessment_period_id == base_period.id)
        .all()
    }
    target_sh = {
        s.slug: s
        for s in db.query(Stakeholder)
        .filter(Stakeholder.assessment_period_id == target_period.id)
        .all()
    }

    stakeholder_deltas = []
    improvements = []
    deteriorations = []

    all_slugs = sorted(set(base_sh.keys()) | set(target_sh.keys()))
    for slug in all_slugs:
        sb = base_sh.get(slug)
        st = target_sh.get(slug)
        name = st.name if st else (sb.name if sb else slug)
        b_score = sb.alignment_score if sb else None
        t_score = st.alignment_score if st else None
        b_cov = sb.evidence_coverage_pct if sb else 0.0
        t_cov = st.evidence_coverage_pct if st else 0.0

        score_delta = (
            round(t_score - b_score, 1)
            if (b_score is not None and t_score is not None)
            else None
        )
        cov_delta = round(t_cov - b_cov, 1)

        if score_delta is not None:
            if score_delta > 0:
                improvements.append(
                    f"{name}: Alignment improved by +{score_delta}% ({b_score}% -> {t_score}%)"
                )
            elif score_delta < 0:
                deteriorations.append(
                    f"{name}: Alignment declined by {score_delta}% ({b_score}% -> {t_score}%)"
                )

        stakeholder_deltas.append(
            {
                "slug": slug,
                "stakeholder_name": name,
                "category": st.category if st else (sb.category if sb else "External"),
                "base_alignment_score": b_score,
                "target_alignment_score": t_score,
                "alignment_delta": score_delta,
                "base_evidence_coverage": b_cov,
                "target_evidence_coverage": t_cov,
                "coverage_delta": cov_delta,
            }
        )

    # Compare 7 Organizational Dimensions
    base_dims = {
        d.dimension_code: d
        for d in db.query(OrganizationalDimension)
        .filter(OrganizationalDimension.assessment_period_id == base_period.id)
        .all()
    }
    target_dims = {
        d.dimension_code: d
        for d in db.query(OrganizationalDimension)
        .filter(OrganizationalDimension.assessment_period_id == target_period.id)
        .all()
    }

    dimension_changes = []
    for code in sorted(set(base_dims.keys()) | set(target_dims.keys())):
        db_dim = base_dims.get(code)
        dt_dim = target_dims.get(code)
        b_status = db_dim.suitability_classification if db_dim else "Insufficient Evidence"
        t_status = dt_dim.suitability_classification if dt_dim else "Insufficient Evidence"
        dimension_changes.append(
            {
                "dimension_code": code,
                "dimension_name": dt_dim.dimension_name if dt_dim else (db_dim.dimension_name if db_dim else code),
                "base_classification": b_status,
                "target_classification": t_status,
                "changed": b_status != t_status,
                "base_evidence_count": db_dim.evidence_count if db_dim else 0,
                "target_evidence_count": dt_dim.evidence_count if dt_dim else 0,
            }
        )

    # Compare Organizational Units & Capabilities (New vs Discontinued)
    base_units = {
        u.unit_name
        for u in db.query(OrganizationalUnit)
        .filter(OrganizationalUnit.assessment_period_id == base_period.id)
        .all()
    }
    target_units = {
        u.unit_name
        for u in db.query(OrganizationalUnit)
        .filter(OrganizationalUnit.assessment_period_id == target_period.id)
        .all()
    }
    new_capabilities = sorted(target_units - base_units)
    discontinued_capabilities = sorted(base_units - target_units)

    # Compare Discovered Stakeholder Expectations
    base_exps = {
        e.title
        for e in db.query(StakeholderExpectation)
        .filter(StakeholderExpectation.assessment_period_id == base_period.id)
        .all()
    }
    target_exps = {
        e.title
        for e in db.query(StakeholderExpectation)
        .filter(StakeholderExpectation.assessment_period_id == target_period.id)
        .all()
    }
    new_expectations = sorted(target_exps - base_exps)

    overall_base = base_period.overall_alignment_score
    overall_target = target_period.overall_alignment_score
    overall_delta = (
        round(overall_target - overall_base, 1)
        if (overall_base is not None and overall_target is not None)
        else None
    )
    cov_delta_overall = round(
        target_period.evidence_coverage_pct - base_period.evidence_coverage_pct, 1
    )

    return {
        "comparison_type": (
            "historical_same_company"
            if base_period.company_id == target_period.company_id
            else "cross_company"
        ),
        "baseline": {
            "assessment_period_id": base_period.id,
            "company_name": base_company.name if base_company else "",
            "title": base_period.title,
            "fiscal_year": base_period.fiscal_year,
            "overall_alignment_score": overall_base,
            "evidence_coverage_pct": base_period.evidence_coverage_pct,
            "document_count": len(base_docs),
        },
        "target": {
            "assessment_period_id": target_period.id,
            "company_name": target_company.name if target_company else "",
            "title": target_period.title,
            "fiscal_year": target_period.fiscal_year,
            "overall_alignment_score": overall_target,
            "evidence_coverage_pct": target_period.evidence_coverage_pct,
            "document_count": len(target_docs),
        },
        "overall_alignment_delta": overall_delta,
        "overall_coverage_delta": cov_delta_overall,
        "stakeholder_comparisons": stakeholder_deltas,
        "dimension_comparisons": dimension_changes,
        "new_capabilities_and_units": new_capabilities,
        "discontinued_or_unmentioned_units": discontinued_capabilities,
        "new_stakeholder_expectations": new_expectations,
        "alignment_improvements": improvements,
        "alignment_deteriorations": deteriorations,
        "date_difference_warnings": date_warnings,
    }

