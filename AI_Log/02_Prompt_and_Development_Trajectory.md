# 2. Chronological Prompt & Development Trajectory Log

This log documents the step-by-step prompts, engineering milestones, and architectural iterations used to build and deploy the **Stakeholder–Structure Alignment Analyzer**.

---

## Entry 1: Comprehensive Product Architecture & Phased Implementation Specification
- **Timestamp:** `2026-11-10 10:39 IST`
- **Objective:** Design and build an explainable organizational diagnostic platform (not a generic chatbot) evaluating alignment across Stakeholder Expectations, Organizational Structure (7 dimensions), Capabilities, Governance, Resource Allocation, and Outcomes for **Meta Platforms, Inc.**, **Snap Inc.**, and **Pinterest, Inc.**
- **Key Requirements Specified in Prompt:**
  - 11-step structured product workflow.
  - 10 stakeholder groups classified into **Internal** (Employees, Senior Management, Board of Directors, Shareholders) and **External** (Users, Advertisers, Creators/Publishers, Regulators, Business Partners, Society).
  - 7 organizational structure dimensions: **Hierarchy**, **Centralization**, **Formalization**, **Specialization**, **Delegation & Authority**, **Coordination & Integration**, and **Governance**.
  - Multi-format document ingestion (`PDF`, `DOCX`, `TXT`, `CSV`, `XLSX`, `PPTX`) with OCR fallback, metadata-aware section chunking, and prompt-injection defense.
  - 4-tier evidence classification (`FACT`, `COMPANY_CLAIM`, `THIRD_PARTY_CLAIM`, `INFERENCE`) and separate Evidence Quality scoring.
  - 15 normalized database tables, 10 separate AI system prompts, rule-based weighted scoring engine, stakeholder conflict matrix/network graph, historical comparison module, and 14-section report export (`PDF`, `DOCX`, `CSV`, `XLSX`).
- **Outcome:**
  1. Created [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) and [`migrations/001_initial_schema.sql`](../migrations/001_initial_schema.sql).
  2. Implemented Phase 1–6 backend modules in `backend/` and modular TypeScript UI views in `frontend/src/`.
  3. Created representative sample datasets in `sample_data/` explicitly labeled as `[Representative Sample Data]` so sample demonstrations are never confused with unverified claims.
  4. Implemented and executed the 13-test automated verification suite in [`tests/test_alignment_analyzer.py`](../tests/test_alignment_analyzer.py).

---

## Entry 2: GitHub Repository & Vercel Cloud Hosting Preparation
- **Timestamp:** `2026-11-10 12:50 IST` — `2026-11-11 19:47 IST`
- **Prompt Summary:** *"We will host it on Vercel. I want you to push it to GitHub first... https://github.com/ManikBodamwad/Alignment_Analyzer"*
- **Engineering Actions Taken:**
  1. Created [`api/index.py`](../api/index.py) and [`vercel.json`](../vercel.json) to expose the FastAPI application as a Vercel Python serverless function.
  2. Updated [`backend/config.py`](../backend/config.py) and [`backend/seed.py`](../backend/seed.py) to detect serverless environments (`VERCEL=1`) and automatically route writable SQLite storage and uploads to `/tmp` when no external PostgreSQL `DATABASE_URL` is configured.
  3. Added idempotent cold-start database initialization middleware in [`backend/main.py`](../backend/main.py).
  4. Initialized Git on branch `main` and pushed the repository to `https://github.com/ManikBodamwad/Alignment_Analyzer.git`.

---

## Entry 3: Diagnosing & Resolving Live Deployment and UI Binding Issues
- **Timestamp:** `2026-11-11 21:49 IST`
- **Prompt Summary:** *"We don't have a working version yet, can you see why it's not working properly?"*
- **Root-Cause Diagnosis & Fixes Applied:**
  1. **Vercel Serverless Static Asset Bundling:** Discovered that Vercel's `@vercel/python` file tracer only bundles `.py` files imported by `api/index.py`, causing `frontend/public/index.html` to be omitted in the serverless container and triggering the bare `<h1>` fallback. Fixed by updating [`frontend/build.mjs`](../frontend/build.mjs) to mirror assets into root `public/` and embed `INDEX_HTML` and `BUNDLE_JS` into [`backend/static_assets.py`](../backend/static_assets.py).
  2. **Lean Serverless Dependencies:** Replaced C-extension vector math with pure-Python cosine similarity in [`backend/services/vector_store.py`](../backend/services/vector_store.py) and slimmed [`requirements.txt`](../requirements.txt) so the serverless deployment stays well under Vercel's 250 MB limit.
  3. **Frontend `<select>` and `<input>` DOM Reconciliation:** Fixed a bug in [`frontend/src/lib/react-lite.ts`](../frontend/src/lib/react-lite.ts) where `<select>` `.value` was assigned before `<option>` children were appended to the DOM node, and added focus/cursor preservation for text inputs.
  4. Committed (`a2ee804`), pushed to GitHub (`main`), and launched the local server on `http://127.0.0.1:8000`.

---

## Entry 4: Academic AI Log Documentation (`AI_Log/`)
- **Timestamp:** `2026-11-11 22:29 IST`
- **Prompt Summary:** *"Make an AI log folder in this; my professor has specifically asked to have an AI log submitted with the assignment, which will be used for the evaluation."*
- **Outcome:** Created the structured `AI_Log/` folder containing methodology, prompt trajectory, debugging/oversight case studies, the 10 system prompts catalog, and empirical test verification logs.
