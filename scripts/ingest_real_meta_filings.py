#!/usr/bin/env python3
"""
Ingest all official Meta filings from data/meta_filings/ into the
Stakeholder–Structure Alignment Analyzer database under a dedicated
comprehensive assessment period.
"""

import sys
import time
from pathlib import Path

from backend.config import settings
from backend.database import SessionLocal
from backend.models import AssessmentPeriod, Company, Document, DocumentChunk
from backend.routers.documents import _process_and_index_document
from backend.services.analysis_engine import ensure_baseline_framework, run_full_diagnostic_analysis

FILINGS_DIR = Path("data/meta_filings")

DOC_METADATA = [
    {
        "filename": "meta-20251231.pdf",
        "title": "Meta Platforms Form 10-K Annual Report (FY2025)",
        "category": "Annual Report / 10-K",
        "publication_date": "2026-02-12",
        "source_url": "https://investor.fb.com/financials/sec-filings/10-K/2025",
    },
    {
        "filename": "meta-20260416.pdf",
        "title": "Meta Platforms DEF 14A Definitive Proxy Statement",
        "category": "Proxy Statement",
        "publication_date": "2026-04-16",
        "source_url": "https://investor.fb.com/financials/sec-filings/DEF14A/2026",
    },
    {
        "filename": "Meta-Corporate-Governance-Guidelines-Effective-June-1-2025.pdf",
        "title": "Meta Platforms Corporate Governance Guidelines",
        "category": "Corporate Governance Guidelines",
        "publication_date": "2025-06-01",
        "source_url": "https://investor.fb.com/corporate-governance/guidelines",
    },
    {
        "filename": "Meta-Audit-Privacy-Committee-Charter-Effective-June-1-2025.pdf",
        "title": "Meta Audit & Privacy Committee Board Charter",
        "category": "Board Committee Charter",
        "publication_date": "2025-06-01",
        "source_url": "https://investor.fb.com/corporate-governance/audit-privacy-charter",
    },
    {
        "filename": "Meta-Compensation-Nominating-Governance-Committee-Charter-Effective-June-1-2025.pdf",
        "title": "Meta Compensation, Nominating & Governance Committee Charter",
        "category": "Board Committee Charter",
        "publication_date": "2025-06-01",
        "source_url": "https://investor.fb.com/corporate-governance/compensation-charter",
    },
    {
        "filename": "Meta-Risk-Strategy-Committee-Charter-Effective-June-1-2025.pdf",
        "title": "Meta Risk & Strategy Committee Board Charter",
        "category": "Board Committee Charter",
        "publication_date": "2025-06-01",
        "source_url": "https://investor.fb.com/corporate-governance/risk-strategy-charter",
    },
    {
        "filename": "Meta-A-R-Bylaws-9-05-2024.pdf",
        "title": "Meta Platforms Amended & Restated Corporate Bylaws",
        "category": "Corporate Bylaws",
        "publication_date": "2024-09-05",
        "source_url": "https://investor.fb.com/corporate-governance/bylaws",
    },
    {
        "filename": "2025-Meta-Code-of-Conduct-02-11-26-English-External.pdf",
        "title": "Meta Global Code of Conduct (2025–2026)",
        "category": "Code of Conduct",
        "publication_date": "2025-02-11",
        "source_url": "https://investor.fb.com/corporate-governance/code-of-conduct",
    },
    {
        "filename": "Building Generative AI Features Responsibly.pdf",
        "title": "Building Generative AI Features Responsibly (AI Governance)",
        "category": "AI Governance & Safety Policy",
        "publication_date": "2025-04-10",
        "source_url": "https://ai.meta.com/responsible-ai",
    },
    {
        "filename": "Community Standards _ Transparency Center.pdf",
        "title": "Meta Community Standards Guidelines",
        "category": "Trust & Safety Guidelines",
        "publication_date": "2025-01-15",
        "source_url": "https://transparency.meta.com/policies/community-standards",
    },
    {
        "filename": "Community Standards Enforcement Report.pdf",
        "title": "Meta Community Standards Enforcement Report",
        "category": "Enforcement & Transparency Report",
        "publication_date": "2025-03-01",
        "source_url": "https://transparency.meta.com/reports/community-standards-enforcement",
    },
    {
        "filename": "Measures Weve Put in Place to Fight Child Exploitation.pdf",
        "title": "Measures to Fight Child Exploitation & Youth Teen Safety Controls",
        "category": "Youth & Child Safety Disclosures",
        "publication_date": "2025-02-01",
        "source_url": "https://about.meta.com/child-safety",
    },
    {
        "filename": "Facebooks-Corporate-Human-Rights-Policy.pdf",
        "title": "Meta Corporate Human Rights Policy",
        "category": "Human Rights Policy",
        "publication_date": "2024-11-01",
        "source_url": "https://about.meta.com/human-rights",
    },
    {
        "filename": "Introduction to the Advertising Standards _ Transparency Center.pdf",
        "title": "Introduction to Meta Advertising Standards",
        "category": "Advertising Standards & Commercial Policy",
        "publication_date": "2025-01-20",
        "source_url": "https://transparency.meta.com/policies/ad-standards",
    },
    {
        "filename": "Creator Fast Track_ A New Way to Quickly Grow Your Audience and Earn Money on Facebook.pdf",
        "title": "Creator Fast Track & Monetization Guidelines",
        "category": "Creator Ecosystem Guidelines",
        "publication_date": "2024-10-15",
        "source_url": "https://creators.facebook.com/fast-track",
    },
    {
        "filename": "Regulatory and Other Transparency Reports.pdf",
        "title": "Regulatory Compliance & Legal Transparency Disclosures",
        "category": "Regulatory Disclosures",
        "publication_date": "2025-02-28",
        "source_url": "https://transparency.meta.com/reports/regulatory",
    },
    {
        "filename": "Document.pdf",
        "title": "Meta Supplemental Platform Governance Disclosures",
        "category": "Supplemental Governance",
        "publication_date": "2025-01-10",
        "source_url": "https://investor.fb.com/governance/supplemental",
    },
    {
        "filename": "Meta_2025-Sustainability-Report.pdf",
        "title": "Meta 2025 Sustainability & ESG Report",
        "category": "Sustainability / ESG Report",
        "publication_date": "2025-05-01",
        "source_url": "https://sustainability.fb.com/reports/2025",
    },
    {
        "filename": "Meta_Human-Rights-Report-July-2022.pdf",
        "title": "Meta Human Rights Report & Independent Impact Assessment",
        "category": "Human Rights Assessment",
        "publication_date": "2022-07-15",
        "source_url": "https://about.meta.com/human-rights-report-2022",
    },
]


def ingest_filings(run_analysis: bool = False):
    with SessionLocal() as db:
        # Find Meta Platforms
        comp = db.query(Company).filter(Company.ticker == "META").first()
        if not comp:
            print("[!] Error: Company Meta Platforms (META) not found.")
            sys.exit(1)

        print(f"[*] Found Company: {comp.name} (ID={comp.id}, Ticker={comp.ticker})")

        period_title = "FY2025 Comprehensive Assessment [Official SEC Filings & Charters]"
        period = (
            db.query(AssessmentPeriod)
            .filter(
                AssessmentPeriod.company_id == comp.id,
                AssessmentPeriod.title == period_title,
            )
            .first()
        )

        if not period:
            period = AssessmentPeriod(
                company_id=comp.id,
                title=period_title,
                fiscal_year="FY2025",
                start_date="2025-01-01",
                end_date="2025-12-31",
                status="draft",
                created_by="Real SEC Filings Batch Pipeline",
            )
            db.add(period)
            db.flush()
            ensure_baseline_framework(db, period)
            db.commit()
            print(f"[+] Created new Assessment Period: ID={period.id} - '{period.title}'")
        else:
            print(f"[*] Using existing Assessment Period: ID={period.id} - '{period.title}'")

        settings.upload_dir.mkdir(parents=True, exist_ok=True)

        existing_doc_titles = {
            d.title: d
            for d in db.query(Document)
            .filter(Document.assessment_period_id == period.id)
            .all()
        }

        total_chunks = 0
        total_ingested = 0

        for idx, item in enumerate(DOC_METADATA, start=1):
            fname = item["filename"]
            fpath = FILINGS_DIR / fname

            if not fpath.exists():
                print(f"[{idx}/{len(DOC_METADATA)}] [SKIP] {fname} not found in {FILINGS_DIR}")
                continue

            doc_title = item["title"]
            if doc_title in existing_doc_titles:
                existing_doc = existing_doc_titles[doc_title]
                cnt = (
                    db.query(DocumentChunk)
                    .filter(DocumentChunk.document_id == existing_doc.id)
                    .count()
                )
                print(f"[{idx}/{len(DOC_METADATA)}] [EXISTS] {doc_title} ({cnt} chunks)")
                total_chunks += cnt
                continue

            file_bytes = fpath.read_bytes()
            safe_fname = f"doc_{comp.id}_{period.id}_{fname.replace('/', '_')}"
            save_path = settings.upload_dir / safe_fname
            save_path.write_bytes(file_bytes)

            doc = Document(
                company_id=comp.id,
                assessment_period_id=period.id,
                title=doc_title,
                category=item["category"],
                financial_year="FY2025",
                publication_date=item.get("publication_date"),
                source_url=item.get("source_url"),
                file_type="PDF",
                file_path=str(save_path),
                file_size=len(file_bytes),
                version="1.0",
                processing_status="processing",
                uploader="Batch Ingestion Script",
            )
            db.add(doc)
            db.commit()
            db.refresh(doc)

            t0 = time.time()
            print(f"[{idx}/{len(DOC_METADATA)}] [PROCESSING] {doc_title} ({len(file_bytes)/1024:.1f} KB)...", end="", flush=True)

            doc = _process_and_index_document(db, doc, file_bytes)
            cnt = (
                db.query(DocumentChunk)
                .filter(DocumentChunk.document_id == doc.id)
                .count()
            )
            dt = time.time() - t0
            print(f" -> [DONE] {cnt} chunks indexed ({dt:.2f}s)")

            total_chunks += cnt
            total_ingested += 1

        print(f"\n[+] Ingestion Complete! Total documents ingested: {total_ingested}, Total chunks: {total_chunks}")

        if run_analysis:
            print("\n[*] Triggering 6-Stage AI Diagnostic Pipeline...")
            t0 = time.time()
            res = run_full_diagnostic_analysis(db, period.id)
            dt = time.time() - t0
            scores = res["scores"]
            from backend.models import AlignmentAssessment, StakeholderConflict, Recommendation
            alignments = db.query(AlignmentAssessment).filter(AlignmentAssessment.assessment_period_id == period.id).all()
            conflicts_cnt = db.query(StakeholderConflict).filter(StakeholderConflict.assessment_period_id == period.id).count()
            recs_cnt = db.query(Recommendation).filter(Recommendation.assessment_period_id == period.id).count()
            strong_cnt = sum(1 for a in alignments if a.classification == "Strong Alignment")
            partial_cnt = sum(1 for a in alignments if a.classification == "Partial Alignment")
            misalign_cnt = sum(1 for a in alignments if a.classification == "Potential Misalignment")
            insuff_cnt = sum(1 for a in alignments if a.classification == "Insufficient Evidence")

            print(f"[+] Full Diagnostic Analysis Complete in {dt:.2f}s!")
            print(f"    Overall Alignment Score: {scores.get('overall_alignment_score', 0):.1f}%")
            print(f"    Evidence Coverage:       {scores.get('evidence_coverage_pct', 0):.1f}%")
            print(f"    Alignments Evaluated:    {len(alignments)}")
            print(f"    Strong Alignment:        {strong_cnt}")
            print(f"    Partial Alignment:       {partial_cnt}")
            print(f"    Potential Misalignment:  {misalign_cnt}")
            print(f"    Insufficient Evidence:   {insuff_cnt}")
            print(f"    Conflicts Identified:    {conflicts_cnt}")
            print(f"    Recommendations:         {recs_cnt}")


if __name__ == "__main__":
    should_analyze = "--run-analysis" in sys.argv
    ingest_filings(run_analysis=should_analyze)

