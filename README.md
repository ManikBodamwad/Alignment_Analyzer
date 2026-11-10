# Stakeholder–Structure Alignment Analyzer

An explainable, evidence-backed organizational diagnostic platform that evaluates whether a company's **organizational structure**, **governance mechanisms**, **capabilities**, **resource allocation**, and **decision-making processes** are aligned with the expectations and requirements of its internal and external stakeholders.

Initially configured with company-specific diagnostic priorities and clearly labeled representative sample datasets for:
1. **Meta Platforms, Inc. (`META`)** — FY2024 & FY2025 Assessments
2. **Snap Inc. (`SNAP`)** — FY2025 Assessment
3. **Pinterest, Inc. (`PINS`)** — FY2025 Assessment

The architecture is fully modular so additional companies, industries, and periodic assessments can be created directly from the UI or REST API without modifying code.

---

## Key Capabilities

1. **11-Step Structured Diagnostic Workflow**:
   - Select or create a company $\rightarrow$ Create or select an assessment period $\rightarrow$ Upload multi-format research documents (`PDF`, `DOCX`, `TXT`, `CSV`, `XLSX`, `PPTX`) $\rightarrow$ Metadata-aware section chunking & vector indexing $\rightarrow$ Extract & classify evidence (`FACT`, `COMPANY_CLAIM`, `THIRD_PARTY_CLAIM`, `INFERENCE`) $\rightarrow$ Profile 10 Internal & External stakeholder groups $\rightarrow$ Assess 7 Organizational Structure dimensions $\rightarrow$ Evaluate Stakeholder–Structure Alignment Matrix $\rightarrow$ Diagnose root causes & stakeholder conflicts $\rightarrow$ Generate actionable recommendations $\rightarrow$ Compare historical periods & export reports (`PDF`, `DOCX`, `CSV`, `XLSX`).
2. **Strict Evidence Grounding & Anti-Fabrication Guardrails**:
   - Every finding cites exact supporting quotations, document title, page number, section heading, publication date, and financial year.
   - Company self-reported claims (`COMPANY_CLAIM`) without independent verification are capped at **Partial Alignment (`3.0`)** and never treated as independently verified outcomes (`Strong Alignment`).
   - Missing public evidence is classified as **`Insufficient Evidence` (`N/A`)** rather than assigned a zero score, and is surfaced via the **Evidence Coverage %** metric alongside the **Overall Alignment Score %**.
   - Untrusted uploaded documents are scanned and sanitized against prompt-injection directives.
3. **Transparent Weighted Scoring Engine & Evaluator Overrides**:
   - **Strong Alignment** = `4`, **Partial Alignment** = `3`, **Potential Misalignment** = `1`, **Insufficient Evidence / Not Applicable** = `N/A`.
   - Evaluators can dynamically adjust **Stakeholder Importance Weights**, **Requirement Weights**, or perform **Manual Classification Overrides** with mandatory justifications recorded in an immutable **Audit Trail**.

---

## Quick Start (Local Execution)

### 1. Run the Application Server

```bash
# Using the preconfigured virtual environment:
./.venv/bin/uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

Then open **http://127.0.0.1:8000** in your browser.
- Interactive Swagger OpenAPI Documentation: **http://127.0.0.1:8000/docs**
- ReDoc API Reference: **http://127.0.0.1:8000/redoc**

### 2. Rebuild the TypeScript Frontend Bundle (Optional after UI edits)

```bash
cd frontend
npm run typecheck
npm run build
```

### 3. Run the Automated Test Suite (All 10 Diagnostic Scenarios)

```bash
./.venv/bin/python -m pytest -v tests/test_alignment_analyzer.py
```

---

## Docker Deployment (PostgreSQL + `pgvector`)

```bash
cp .env.example .env
docker compose up --build -d
```

This launches:
- `db`: PostgreSQL 16 with the `pgvector` extension initialized via `migrations/001_initial_schema.sql`.
- `backend`: FastAPI backend + compiled frontend SPA on port `8000`.

---

## REST API Summary

| Category | Endpoint | Method | Description |
|---|---|---|---|
| **Companies** | `/api/companies` | `GET`, `POST` | List or create companies and company-specific analysis priorities |
| **Companies** | `/api/companies/{id}` | `GET`, `PUT` | Retrieve or update company details |
| **Assessments** | `/api/assessments` | `GET`, `POST` | List or create assessment periods |
| **Assessments** | `/api/assessments/{id}` | `GET`, `PUT` | Full dashboard summary, metrics, and metadata update |
| **Assessments** | `/api/assessments/{id}/run-analysis` | `POST` | Run the 6-stage AI diagnostic analysis pipeline |
| **Assessments** | `/api/assessments/{id}/recalculate-scores` | `POST` | Recalculate weighted alignment & evidence coverage scores |
| **Assessments** | `/api/assessments/compare` | `GET` | Compare two assessment periods (`?base_id=1&target_id=2`) |
| **Documents** | `/api/documents/upload` | `POST` | Multi-file upload (`PDF`, `DOCX`, `TXT`, `CSV`, `XLSX`, `PPTX`) |
| **Documents** | `/api/documents` | `GET` | List documents for a company / assessment period |
| **Documents** | `/api/documents/{id}` | `GET`, `DELETE` | Inspect chunks, metadata, or archive/delete document |
| **Documents** | `/api/documents/search/chunks` | `GET` | Semantic vector RAG retrieval with metadata filtering |
| **Stakeholders** | `/api/stakeholders` | `GET` | List internal & external stakeholder profiles and alignment counts |
| **Stakeholders** | `/api/stakeholders/{id}/weight` | `PUT` | Update stakeholder importance weight & recalculate scores |
| **Evidence** | `/api/evidence` | `GET` | Filter evidence by company, period, stakeholder, dimension, or class |
| **Analysis** | `/api/analysis/{id}/structure` | `GET` | 7-dimension structure evaluation & disclosed organizational units |
| **Analysis** | `/api/analysis/{id}/alignment-matrix` | `GET` | Full Stakeholder $\times$ Dimension Alignment Matrix & citations |
| **Analysis** | `/api/analysis/alignments/{id}/override` | `POST` | Override AI classification with mandatory justification & audit log |
| **Analysis** | `/api/analysis/{id}/conflicts` | `GET` | Stakeholder conflict matrix & resolution mechanisms |
| **Analysis** | `/api/analysis/{id}/recommendations` | `GET` | Prioritized recommendations (`Critical`, `High`, `Medium`, `Low`) |
| **Reports** | `/api/reports/{id}` | `GET` | Compile 14-section structured diagnostic report |
| **Reports** | `/api/reports/{id}/export/pdf` | `GET` | Export 14-section report as binary `.pdf` |
| **Reports** | `/api/reports/{id}/export/docx` | `GET` | Export 14-section report as OpenXML Word `.docx` |
| **Reports** | `/api/reports/{id}/export/evidence-csv` | `GET` | Export Evidence Repository as `.csv` |
| **Reports** | `/api/reports/{id}/export/evidence-xlsx` | `GET` | Export Evidence Repository as OpenXML Excel `.xlsx` |

