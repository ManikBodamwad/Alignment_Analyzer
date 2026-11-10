"""Reports & Binary Export REST API Router (JSON, PDF, DOCX, CSV, XLSX)."""

from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.services.report_generator import (
    export_evidence_to_csv_bytes,
    export_evidence_to_xlsx_bytes,
    export_report_to_docx_bytes,
    export_report_to_pdf_bytes,
    generate_structured_report,
)

router = APIRouter(prefix="/api/reports", tags=["Reports & Exports"])


@router.get("/{assessment_id}", response_model=Dict[str, Any])
def get_assessment_report(assessment_id: int, db: Session = Depends(get_db)):
    try:
        return generate_structured_report(db, assessment_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/{assessment_id}/export/pdf")
def export_report_pdf(assessment_id: int, db: Session = Depends(get_db)):
    try:
        report = generate_structured_report(db, assessment_id)
        pdf_bytes = export_report_to_pdf_bytes(report)
        filename = f"Alignment_Report_{assessment_id}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            },
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/{assessment_id}/export/docx")
def export_report_docx(assessment_id: int, db: Session = Depends(get_db)):
    try:
        report = generate_structured_report(db, assessment_id)
        docx_bytes = export_report_to_docx_bytes(report)
        filename = f"Alignment_Report_{assessment_id}.docx"
        return Response(
            content=docx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            },
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/{assessment_id}/export/evidence-csv")
def export_evidence_csv(assessment_id: int, db: Session = Depends(get_db)):
    csv_bytes = export_evidence_to_csv_bytes(db, assessment_period_id=assessment_id)
    filename = f"Evidence_Repository_{assessment_id}.csv"
    return Response(
        content=csv_bytes,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{assessment_id}/export/evidence-xlsx")
def export_evidence_xlsx(assessment_id: int, db: Session = Depends(get_db)):
    xlsx_bytes = export_evidence_to_xlsx_bytes(db, assessment_period_id=assessment_id)
    filename = f"Evidence_Repository_{assessment_id}.xlsx"
    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

