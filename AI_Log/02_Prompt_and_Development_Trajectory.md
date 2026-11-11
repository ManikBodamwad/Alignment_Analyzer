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

---

## Entry 5: Groq Cloud LLM (`llama-3.3-70b-versatile`) Integration for Live AI Diagnostic Features
- **Timestamp:** `2026-11-11 22:38 IST`
- **Prompt Summary:** *"Add Groq API key for AI features."*
- **Engineering & Security Actions Taken:**
  1. **Secret Protection:** Stored `GROQ_API_KEY` in the gitignored `.env` file (never hardcoded in tracked Git files, preventing GitHub Push Protection secret-scanning blocks) and updated [`backend/config.py`](../backend/config.py) to auto-load `.env` at startup and default `LLM_PROVIDER=groq` and `LLM_MODEL=llama-3.3-70b-versatile`.
  2. **Zero-Dependency Groq Client:** Implemented `_call_groq_chat_completion` and `generate_ai_executive_synthesis` in [`backend/services/llm_provider.py`](../backend/services/llm_provider.py) using Python's standard library `urllib.request` against `https://api.groq.com/openai/v1/chat/completions` with JSON mode (`response_format={"type": "json_object"}`) and automatic JSON repair/fallback.
  3. **Live AI Synthesis & Runtime Configuration Endpoints:** Added `GET/POST /api/analysis/llm-config` and `POST /api/analysis/{assessment_id}/ai-synthesize` in [`backend/routers/analysis.py`](../backend/routers/analysis.py).
  4. **Interactive Frontend Controls:** Added the **Live Groq AI Executive Diagnostic & Evidence Q&A Synthesis** panel in [`frontend/src/components/DashboardView.tsx`](../frontend/src/components/DashboardView.tsx) and the **Groq Cloud LLM Configuration** card in [`frontend/src/components/SettingsView.tsx`](../frontend/src/components/SettingsView.tsx).

---

## Entry 6: Master Development Prompt Execution — Full AI Diagnostic Engine Upgrade & Premium Dark UI Transformation
- **Timestamp:** `2026-11-12 00:00 IST` — `2026-11-12 00:45 IST`
- **Prompt Summary:** *"Execute phase 0 only for now... [Full Master Development Prompt: AI Intelligence Engine Upgrade + Premium UI/UX Transformation]"* followed by progressive human approval to execute subsequent phases.
- **Key Architectural Problems Addressed:**
  1. **Prompt Disconnect:** The original diagnostic engine (`run_full_diagnostic_analysis`) was reliant on heuristic regex rules while the 10 system prompts in `prompts.py` were disconnected from the primary execution pipeline.
  2. **Quotation Hallucination Risk:** Without verbatim source chunk verification, LLMs could invent plausible-sounding citations or page numbers.
  3. **Visual UI Baseline:** The previous UI used standard white/slate backgrounds rather than a premium, dark enterprise SaaS presentation.
- **Engineering Deliverables Implemented:**
  1. **Phase 0 (System Audit & Phased Plan):** Analyzed all 10 diagnostic stages, verified heuristics vs. LLM integration points, and outlined a 7-phase modernization roadmap.
  2. **Phase 1 (Foundation & Provenance Gate):**
     - Authored [`backend/services/evidence_validator.py`](../backend/services/evidence_validator.py) implementing `verify_quotation_in_chunk`, `find_matching_chunk_for_quotation`, and `enforce_company_claim_cap`.
     - Created typed Pydantic v2 schemas in [`backend/schemas.py`](../backend/schemas.py) for all 10 prompt outputs (`LLMEvidenceList`, `LLMExpectationList`, `LLMStructureOutput`, `LLMMappingList`, `LLMAlignmentList`, `LLMRootCauseList`, `LLMConflictList`, `LLMRecommendationList`).
     - Added local vector embedding provider (`sentence-transformers/all-MiniLM-L6-v2`) in [`backend/services/vector_store.py`](../backend/services/vector_store.py) and content-hash disk caching in [`backend/services/llm_provider.py`](../backend/services/llm_provider.py).
     - Defined design tokens and keyframe animations in [`frontend/src/styles/design-system.css`](../frontend/src/styles/design-system.css).
  3. **Phase 2 (Core AI Diagnostic Pipeline):**
     - Connected all diagnostic stages in [`backend/services/analysis_engine.py`](../backend/services/analysis_engine.py) to Groq LLM inference via `call_external_llm_json`:
       - Stage 1: Expectation discovery from document text (`stakeholder_expectation_extraction`).
       - Stage 2 & 4: Evidence extraction and classification (`evidence_classification`) with strict quotation matching against database chunks.
       - Stage 3: Organizational structure unit extraction (`organizational_structure_extraction`).
       - Stage 5: Stakeholder-to-structure mapping (`stakeholder_structure_mapping`).
       - Stage 6: Alignment assessment (`alignment_assessment`).
       - Stage 7: Root-cause diagnosis (`root_cause_analysis`).
       - Stage 8: Stakeholder conflicts (`stakeholder_conflicts`).
       - Stage 9: Structural recommendations (`recommendations`).
       - Stage 10: Executive synthesis (`executive_summary_synthesis`).
     - Enforced strict capping of unverified `COMPANY_CLAIM` records at Partial Alignment ($3.0 / 4.0$).
     - Preserved Python deterministic calculations for all numerical scores ($w_i \cdot s_i$).
  4. **Phase 3 (Signature UI & Dashboard):**
     - Created [`frontend/src/components/EvidenceToInsightFlow.tsx`](../frontend/src/components/EvidenceToInsightFlow.tsx), an interactive 6-stage node-link pipeline diagram with live audit rules and academic guarantees.
     - Upgraded [`frontend/src/components/DashboardView.tsx`](../frontend/src/components/DashboardView.tsx) to dark glassmorphism with glowing radial score gauges and live Groq AI synthesis.
     - Upgraded [`frontend/src/components/MatrixView.tsx`](../frontend/src/components/MatrixView.tsx) with glowing status cells, score math transparency, and a slide-over evidence inspection drawer.
     - Upgraded [`frontend/src/components/StakeholdersView.tsx`](../frontend/src/components/StakeholdersView.tsx) with dark glass cards and interactive weight calibration sliders.
  5. **Phase 5 (Remaining Screens Modernized):**
     - Refactored [`DocumentsView.tsx`](../frontend/src/components/DocumentsView.tsx), [`StructureView.tsx`](../frontend/src/components/StructureView.tsx), [`ConflictsView.tsx`](../frontend/src/components/ConflictsView.tsx), [`RecommendationsView.tsx`](../frontend/src/components/RecommendationsView.tsx), [`ReportView.tsx`](../frontend/src/components/ReportView.tsx), [`ComparisonView.tsx`](../frontend/src/components/ComparisonView.tsx), and [`SettingsView.tsx`](../frontend/src/components/SettingsView.tsx) to match the dark midnight SaaS theme.
  6. **Phase 6 (Verification & Build):**
     - Compiled frontend bundle (170 KB) via `build.mjs` with zero TypeScript errors (`tsc --noEmit`).
     - Executed full test suite: **15 / 15 tests passed** in 9.68s.



