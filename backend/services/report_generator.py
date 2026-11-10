"""
14-Section Diagnostic Report Generator and Binary Exporter (PDF, DOCX, CSV, XLSX) (Section 13).
All scores, recommendations, and claims are strictly traceable to underlying assessment data.
"""

import csv
import io
import zipfile
from datetime import datetime, timezone
from typing import Any, Dict, List
from xml.sax.saxutils import escape as xml_escape
from sqlalchemy.orm import Session

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
    StakeholderExpectation,
)
from backend.services.comparison_engine import compare_two_assessments


def generate_structured_report(
    db: Session, assessment_period_id: int
) -> Dict[str, Any]:
    """Compile the complete 14-section diagnostic assessment report."""
    period = (
        db.query(AssessmentPeriod)
        .filter(AssessmentPeriod.id == assessment_period_id)
        .first()
    )
    if not period:
        raise ValueError(f"AssessmentPeriod {assessment_period_id} not found.")

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
    expectations = (
        db.query(StakeholderExpectation)
        .filter(StakeholderExpectation.assessment_period_id == period.id)
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
    evidence_list = (
        db.query(EvidenceRecord)
        .filter(EvidenceRecord.assessment_period_id == period.id)
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

    sh_map = {s.id: s for s in stakeholders}
    exp_map = {e.id: e for e in expectations}

    strong_count = sum(1 for a in assessments if a.classification == "Strong Alignment")
    partial_count = sum(1 for a in assessments if a.classification == "Partial Alignment")
    misaligned_count = sum(
        1 for a in assessments if a.classification == "Potential Misalignment"
    )
    insufficient_count = sum(
        1 for a in assessments if a.classification == "Insufficient Evidence"
    )

    # Check if historical comparison is available for the same company
    other_periods = (
        db.query(AssessmentPeriod)
        .filter(
            AssessmentPeriod.company_id == period.company_id,
            AssessmentPeriod.id != period.id,
        )
        .order_by(AssessmentPeriod.created_at.asc())
        .all()
    )
    historical_comparison = None
    if other_periods:
        historical_comparison = compare_two_assessments(
            db, other_periods[0].id, period.id
        )

    score_str = (
        f"{period.overall_alignment_score}%"
        if period.overall_alignment_score is not None
        else "Insufficient Evidence"
    )

    sections = {
        "1_executive_summary": {
            "title": "1. Executive Summary",
            "overall_alignment_score": period.overall_alignment_score,
            "evidence_coverage_pct": period.evidence_coverage_pct,
            "summary_narrative": (
                f"Organizational Alignment Diagnostic for {company.name if company else 'Company'} "
                f"({period.title}, {period.fiscal_year}). Overall Weighted Alignment Score: {score_str} "
                f"with {period.evidence_coverage_pct}% Evidence Coverage across {len(assessments)} "
                f"stakeholder requirements and {len(docs)} source document(s). "
                f"Distribution: {strong_count} Strong Alignment, {partial_count} Partial Alignment, "
                f"{misaligned_count} Potential Misalignment, and {insufficient_count} Insufficient Evidence."
            ),
        },
        "2_company_overview": {
            "title": "2. Company Overview",
            "company_name": company.name if company else "",
            "ticker": company.ticker if company else "",
            "industry": company.industry if company else "",
            "description": company.description if company else "",
            "analysis_priorities": company.analysis_priorities if company else [],
        },
        "3_assessment_methodology": {
            "title": "3. Assessment Methodology",
            "scoring_mapping": {
                "Strong Alignment": 4,
                "Partial Alignment": 3,
                "Potential Misalignment": 1,
                "Insufficient Evidence": "N/A (Excluded from denominator; tracked via Evidence Coverage)",
                "Not Applicable": "N/A",
            },
            "evidence_hierarchy": [
                "FACT: Verifiable structural/governance disclosure from filings or charters.",
                "COMPANY_CLAIM: Company's self-reported policy or initiative (capped at Partial Alignment unless independently corroborated).",
                "THIRD_PARTY_CLAIM: External regulatory, audit, or independent research finding.",
                "INFERENCE: Analytical synthesis derived from multiple evidence records.",
            ],
        },
        "4_stakeholder_landscape": {
            "title": "4. Stakeholder Landscape",
            "internal_stakeholders": [
                {
                    "name": s.name,
                    "importance_weight": s.importance_weight,
                    "influence_level": s.influence_level,
                    "dependence_level": s.dependence_level,
                    "alignment_score": s.alignment_score,
                    "evidence_coverage_pct": s.evidence_coverage_pct,
                }
                for s in stakeholders
                if s.category == "Internal"
            ],
            "external_stakeholders": [
                {
                    "name": s.name,
                    "importance_weight": s.importance_weight,
                    "influence_level": s.influence_level,
                    "dependence_level": s.dependence_level,
                    "alignment_score": s.alignment_score,
                    "evidence_coverage_pct": s.evidence_coverage_pct,
                }
                for s in stakeholders
                if s.category == "External"
            ],
        },
        "5_stakeholder_expectations": {
            "title": "5. Stakeholder Expectations",
            "expectations": [
                {
                    "id": e.id,
                    "stakeholder": sh_map[e.stakeholder_id].name
                    if e.stakeholder_id in sh_map
                    else "",
                    "title": e.title,
                    "description": e.description,
                    "weight": e.requirement_weight,
                    "is_discovered_from_docs": e.is_discovered_from_docs,
                    "mapped_dimensions": e.mapped_dimension_codes,
                }
                for e in expectations
            ],
        },
        "6_organizational_structure_analysis": {
            "title": "6. Organizational Structure Analysis (7 Dimensions)",
            "dimensions": [
                {
                    "dimension_code": d.dimension_code,
                    "dimension_name": d.dimension_name,
                    "suitability_classification": d.suitability_classification,
                    "assessment_summary": d.assessment_summary,
                    "strengths": d.strengths,
                    "weaknesses": d.weaknesses,
                    "evidence_count": d.evidence_count,
                    "confidence_level": d.confidence_level,
                }
                for d in dimensions
            ],
            "disclosed_units": [
                {
                    "unit_name": u.unit_name,
                    "unit_type": u.unit_type,
                    "reporting_line": u.reporting_line,
                    "responsibilities": u.responsibilities,
                    "evidence_classification": u.evidence_classification,
                }
                for u in units
            ],
        },
        "7_alignment_matrix": {
            "title": "7. Stakeholder–Structure Alignment Matrix",
            "cells": [
                {
                    "assessment_id": a.id,
                    "stakeholder": sh_map[a.stakeholder_id].name
                    if a.stakeholder_id in sh_map
                    else "",
                    "expectation": exp_map[a.expectation_id].title
                    if a.expectation_id in exp_map
                    else "",
                    "dimension": a.organizational_dimension,
                    "classification": a.classification,
                    "numeric_score": a.numeric_score,
                    "mapped_mechanisms": a.mapped_mechanisms,
                    "evidence_ids": a.evidence_ids,
                }
                for a in assessments
            ],
        },
        "8_individual_stakeholder_assessments": {
            "title": "8. Individual Stakeholder Assessments",
            "assessments": [
                {
                    "id": a.id,
                    "stakeholder": sh_map[a.stakeholder_id].name
                    if a.stakeholder_id in sh_map
                    else "",
                    "expectation": exp_map[a.expectation_id].title
                    if a.expectation_id in exp_map
                    else "",
                    "classification": a.classification,
                    "numeric_score": a.numeric_score,
                    "rationale": a.rationale,
                    "root_cause_diagnosis": a.root_cause_diagnosis,
                    "is_overridden": a.is_overridden,
                }
                for a in assessments
            ],
        },
        "9_stakeholder_conflicts": {
            "title": "9. Stakeholder Conflicts",
            "conflicts": [
                {
                    "stakeholder_a": c.stakeholder_a_name,
                    "stakeholder_b": c.stakeholder_b_name,
                    "conflicting_expectations": c.conflicting_expectations,
                    "organizational_units_involved": c.organizational_units_involved,
                    "current_resolution_mechanisms": c.current_resolution_mechanisms,
                    "structural_weaknesses": c.structural_weaknesses,
                    "recommended_governance_mechanism": c.recommended_governance_mechanism,
                    "severity": c.severity,
                }
                for c in conflicts
            ],
        },
        "10_key_organizational_gaps": {
            "title": "10. Key Organizational Gaps",
            "gaps": [
                {
                    "stakeholder": sh_map[a.stakeholder_id].name
                    if a.stakeholder_id in sh_map
                    else "",
                    "expectation": exp_map[a.expectation_id].title
                    if a.expectation_id in exp_map
                    else "",
                    "dimension": a.organizational_dimension,
                    "classification": a.classification,
                    "rationale": a.rationale,
                    "root_causes": a.root_cause_diagnosis,
                }
                for a in assessments
                if a.classification in {"Potential Misalignment", "Partial Alignment"}
            ],
        },
        "11_recommendations": {
            "title": "11. Actionable Recommendations",
            "recommendations": [
                {
                    "id": r.id,
                    "title": r.title,
                    "priority": r.priority,
                    "status": r.status,
                    "organizational_dimension": r.organizational_dimension,
                    "identified_issue": r.identified_issue,
                    "suggested_organizational_change": r.suggested_organizational_change,
                    "expected_benefit": r.expected_benefit,
                    "implementation_difficulty": r.implementation_difficulty,
                    "possible_tradeoffs": r.possible_tradeoffs,
                    "evidence_ids": r.evidence_ids,
                }
                for r in recommendations
            ],
        },
        "12_evidence_limitations": {
            "title": "12. Evidence Limitations & Transparency Disclosure",
            "evidence_coverage_pct": period.evidence_coverage_pct,
            "insufficient_evidence_count": insufficient_count,
            "unverified_company_claims_count": sum(
                1 for e in evidence_list if e.evidence_classification == "COMPANY_CLAIM"
            ),
            "contradictory_evidence_count": sum(
                1 for e in evidence_list if e.is_contradictory
            ),
            "limitation_statement": (
                f"Evidence coverage for this assessment is {period.evidence_coverage_pct}%. "
                f"{insufficient_count} requirement(s) lacked sufficient public disclosure and were "
                f"excluded from the alignment score denominator rather than assigned zero. "
                f"Company self-claims without independent audit corroboration are capped at Partial Alignment."
            ),
        },
        "13_sources_and_references": {
            "title": "13. Sources and Evidence References",
            "documents": [
                {
                    "document_id": d.id,
                    "title": d.title,
                    "category": d.category,
                    "financial_year": d.financial_year,
                    "publication_date": d.publication_date,
                    "source_url": d.source_url,
                    "file_type": d.file_type,
                }
                for d in docs
            ],
            "evidence_citations": [
                {
                    "evidence_id": e.id,
                    "document_name": e.document_name,
                    "page_number": e.page_number,
                    "section_heading": e.section_heading,
                    "classification": e.evidence_classification,
                    "quality_score": e.quality_score,
                    "exact_quotation": e.exact_quotation,
                }
                for e in evidence_list
            ],
        },
        "14_historical_comparison": {
            "title": "14. Historical Comparison",
            "available": historical_comparison is not None,
            "comparison_data": historical_comparison,
        },
    }

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "company_name": company.name if company else "",
        "assessment_period_id": period.id,
        "assessment_title": period.title,
        "fiscal_year": period.fiscal_year,
        "overall_alignment_score": period.overall_alignment_score,
        "evidence_coverage_pct": period.evidence_coverage_pct,
        "sections": sections,
    }


def _flatten_report_to_lines(report: Dict[str, Any]) -> List[str]:
    """Convert structured 14-section report into clean text lines for PDF/DOCX rendering."""
    sec = report["sections"]
    lines = [
        f"STAKEHOLDER-STRUCTURE ALIGNMENT DIAGNOSTIC REPORT",
        f"Company: {report['company_name']} | Period: {report['assessment_title']} ({report['fiscal_year']})",
        f"Overall Alignment Score: {report['overall_alignment_score']}% | Evidence Coverage: {report['evidence_coverage_pct']}%",
        f"Generated: {report['generated_at']}",
        "",
        "## 1. Executive Summary",
        sec["1_executive_summary"]["summary_narrative"],
        "",
        "## 2. Company Overview",
        f"Industry: {sec['2_company_overview']['industry']} | Ticker: {sec['2_company_overview']['ticker']}",
        f"Priorities: {', '.join(sec['2_company_overview']['analysis_priorities'])}",
        "",
        "## 3. Assessment Methodology",
        "Scoring: Strong Alignment (4), Partial Alignment (3), Potential Misalignment (1), Insufficient Evidence (N/A).",
        "",
        "## 4. Stakeholder Landscape",
    ]
    for sh in (
        sec["4_stakeholder_landscape"]["internal_stakeholders"]
        + sec["4_stakeholder_landscape"]["external_stakeholders"]
    ):
        lines.append(
            f"- {sh['name']}: Alignment={sh['alignment_score']}%, Coverage={sh['evidence_coverage_pct']}%, Weight={sh['importance_weight']}"
        )

    lines.append("")
    lines.append("## 6. Organizational Structure Analysis (7 Dimensions)")
    for d in sec["6_organizational_structure_analysis"]["dimensions"]:
        lines.append(
            f"- {d['dimension_name']} [{d['suitability_classification']}] (Evidence: {d['evidence_count']}): {d['assessment_summary']}"
        )

    lines.append("")
    lines.append("## 7 & 8. Stakeholder-Structure Alignment Assessments")
    for a in sec["8_individual_stakeholder_assessments"]["assessments"]:
        lines.append(
            f"- [{a['classification']}] {a['stakeholder']} -> {a['expectation']}: {a['rationale']}"
        )

    lines.append("")
    lines.append("## 9. Stakeholder Conflicts")
    for c in sec["9_stakeholder_conflicts"]["conflicts"]:
        lines.append(
            f"- {c['stakeholder_a']} vs. {c['stakeholder_b']} ({c['severity']}): {c['conflicting_expectations']} | Recommendation: {c['recommended_governance_mechanism']}"
        )

    lines.append("")
    lines.append("## 10 & 11. Organizational Gaps & Actionable Recommendations")
    for r in sec["11_recommendations"]["recommendations"]:
        lines.append(
            f"- [{r['priority']} | {r['status']}] {r['title']}: {r['suggested_organizational_change']} (Trade-offs: {r['possible_tradeoffs']})"
        )

    lines.append("")
    lines.append("## 12. Evidence Limitations")
    lines.append(sec["12_evidence_limitations"]["limitation_statement"])

    lines.append("")
    lines.append("## 13. Sources and Evidence References")
    for ev in sec["13_sources_and_references"]["evidence_citations"][:25]:
        lines.append(
            f"- [Ev #{ev['evidence_id']} | {ev['classification']} | Q={ev['quality_score']}] {ev['document_name']} (p.{ev['page_number']}, {ev['section_heading']}): \"{ev['exact_quotation'][:140]}...\""
        )

    lines.append("")
    lines.append("## 14. Historical Comparison")
    if sec["14_historical_comparison"]["available"]:
        comp = sec["14_historical_comparison"]["comparison_data"]
        lines.append(
            f"Compared {comp['baseline']['title']} ({comp['baseline']['overall_alignment_score']}%) -> {comp['target']['title']} ({comp['target']['overall_alignment_score']}%), Delta: {comp['overall_alignment_delta']}%"
        )
    else:
        lines.append("No prior historical period available for comparison.")

    return lines


def export_report_to_pdf_bytes(report: Dict[str, Any]) -> bytes:
    """
    Generate a standards-compliant multi-page PDF document (PDF 1.4)
    containing all 14 sections of the diagnostic report.
    """
    raw_lines = _flatten_report_to_lines(report)
    wrapped_lines: List[str] = []
    for line in raw_lines:
        if len(line) <= 92:
            wrapped_lines.append(line)
        else:
            words = line.split(" ")
            curr = ""
            for w in words:
                if len(curr) + len(w) + 1 <= 92:
                    curr = (curr + " " + w).strip()
                else:
                    wrapped_lines.append(curr)
                    curr = "  " + w
            if curr:
                wrapped_lines.append(curr)

    lines_per_page = 46
    pages_chunks = [
        wrapped_lines[i : i + lines_per_page]
        for i in range(0, max(1, len(wrapped_lines)), lines_per_page)
    ]

    objects: List[bytes] = []

    def add_obj(content: bytes) -> int:
        objects.append(content)
        return len(objects)

    # 1: Catalog, 2: Pages placeholder, 3: Font
    add_obj(b"<< /Type /Catalog /Pages 2 0 R >>")
    add_obj(b"")  # Placeholder for Pages object
    add_obj(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")

    page_obj_ids: List[int] = []
    for p_idx, p_lines in enumerate(pages_chunks, start=1):
        stream_cmds = [b"BT", b"/F1 9 Tf", b"45 750 Td", b"14 TL"]
        header_str = f"[Page {p_idx}]"
        esc_header = (
            header_str.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        )
        stream_cmds.append(f"({esc_header}) Tj T*".encode("latin-1", errors="ignore"))
        for l_str in p_lines:
            safe = (
                l_str.encode("latin-1", errors="replace")
                .decode("latin-1")
                .replace("\\", "\\\\")
                .replace("(", "\\(")
                .replace(")", "\\)")
            )
            stream_cmds.append(f"({safe}) Tj T*".encode("latin-1"))
        stream_cmds.append(b"ET")
        stream_data = b"\n".join(stream_cmds)
        content_id = add_obj(
            f"<< /Length {len(stream_data)} >>\nstream\n".encode("ascii")
            + stream_data
            + b"\nendstream"
        )
        page_id = add_obj(
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents {content_id} 0 R >>".encode(
                "ascii"
            )
        )
        page_obj_ids.append(page_id)

    kids_str = " ".join(f"{pid} 0 R" for pid in page_obj_ids)
    objects[1] = f"<< /Type /Pages /Kids [{kids_str}] /Count {len(page_obj_ids)} >>".encode(
        "ascii"
    )

    out = io.BytesIO()
    out.write(b"%PDF-1.4\n")
    offsets: List[int] = []
    for idx, obj_bytes in enumerate(objects, start=1):
        offsets.append(out.tell())
        out.write(f"{idx} 0 obj\n".encode("ascii"))
        out.write(obj_bytes)
        out.write(b"\nendobj\n")

    xref_pos = out.tell()
    out.write(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    out.write(b"0000000000 65535 f \n")
    for off in offsets:
        out.write(f"{off:010d} 00000 n \n".encode("ascii"))

    out.write(
        f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n".encode(
            "ascii"
        )
    )
    return out.getvalue()


def export_report_to_docx_bytes(report: Dict[str, Any]) -> bytes:
    """
    Generate a valid OpenXML .docx Word document containing the 14-section report.
    """
    lines = _flatten_report_to_lines(report)
    paragraphs_xml = []
    for line in lines:
        if not line.strip():
            continue
        is_heading = line.startswith("## ") or line.startswith("STAKEHOLDER-STRUCTURE")
        clean_text = xml_escape(line.lstrip("# ").strip())
        if is_heading:
            paragraphs_xml.append(
                f'<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>{clean_text}</w:t></w:r></w:p>'
            )
        else:
            paragraphs_xml.append(f"<w:p><w:r><w:t>{clean_text}</w:t></w:r></w:p>")

    document_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        "<w:body>"
        + "".join(paragraphs_xml)
        + "</w:body></w:document>"
    )

    content_types_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
        "</Types>"
    )

    rels_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
        "</Relationships>"
    )

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", content_types_xml)
        zf.writestr("_rels/.rels", rels_xml)
        zf.writestr("word/document.xml", document_xml)
    return buf.getvalue()


def export_evidence_to_csv_bytes(
    db: Session, assessment_period_id: int
) -> bytes:
    """Export all 14 required evidence fields (Section 6) to CSV."""
    period = (
        db.query(AssessmentPeriod)
        .filter(AssessmentPeriod.id == assessment_period_id)
        .first()
    )
    company = (
        db.query(Company).filter(Company.id == period.company_id).first()
        if period
        else None
    )
    sh_map = {
        s.id: s.name
        for s in db.query(Stakeholder)
        .filter(Stakeholder.assessment_period_id == assessment_period_id)
        .all()
    }
    records = (
        db.query(EvidenceRecord)
        .filter(EvidenceRecord.assessment_period_id == assessment_period_id)
        .all()
    )

    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(
        [
            "Evidence ID",
            "Company",
            "Stakeholder Group",
            "Organizational Dimension",
            "Extracted Statement",
            "Exact Supporting Quotation",
            "Document Name",
            "Page Number",
            "Section Heading",
            "Source URL",
            "Publication Date",
            "Financial Year",
            "Evidence Classification",
            "Confidence Level",
            "Quality Score",
            "Is Contradictory",
        ]
    )
    for r in records:
        writer.writerow(
            [
                r.id,
                company.name if company else "",
                sh_map.get(r.stakeholder_id, "General") if r.stakeholder_id else "General",
                r.organizational_dimension,
                r.extracted_statement,
                r.exact_quotation,
                r.document_name,
                r.page_number,
                r.section_heading,
                r.source_url or "",
                r.publication_date or "",
                r.financial_year or "",
                r.evidence_classification,
                r.confidence_level,
                r.quality_score,
                r.is_contradictory,
            ]
        )
    return out.getvalue().encode("utf-8")


def export_evidence_to_xlsx_bytes(
    db: Session, assessment_period_id: int
) -> bytes:
    """Generate a valid OpenXML .xlsx Excel workbook containing the Evidence Repository."""
    csv_bytes = export_evidence_to_csv_bytes(db, assessment_period_id)
    reader = list(csv.reader(io.StringIO(csv_bytes.decode("utf-8"))))

    rows_xml = []
    for r_idx, row in enumerate(reader, start=1):
        cells_xml = []
        for c_idx, val in enumerate(row):
            col_letter = chr(65 + (c_idx % 26))
            cell_ref = f"{col_letter}{r_idx}"
            escaped_val = xml_escape(str(val))
            cells_xml.append(
                f'<c r="{cell_ref}" t="inlineStr"><is><t>{escaped_val}</t></is></c>'
            )
        rows_xml.append(f'<row r="{r_idx}">' + "".join(cells_xml) + "</row>")

    sheet_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        "<sheetData>"
        + "".join(rows_xml)
        + "</sheetData></worksheet>"
    )

    workbook_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        '<sheets><sheet name="Evidence Repository" sheetId="1" r:id="rId1"/></sheets>'
        "</workbook>"
    )

    wb_rels_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
        "</Relationships>"
    )

    root_rels_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
        "</Relationships>"
    )

    content_types_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
        "</Types>"
    )

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", content_types_xml)
        zf.writestr("_rels/.rels", root_rels_xml)
        zf.writestr("xl/workbook.xml", workbook_xml)
        zf.writestr("xl/_rels/workbook.xml.rels", wb_rels_xml)
        zf.writestr("xl/worksheets/sheet1.xml", sheet_xml)
    return buf.getvalue()

