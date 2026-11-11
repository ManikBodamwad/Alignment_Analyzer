# 3. Critical Evaluation, Debugging & Human Oversight Log

A core requirement of rigorous AI-assisted engineering is **never accepting initial AI outputs uncritically**. Below are four concrete case studies during development where initial AI-generated logic or configurations exhibited flaws, how those flaws were detected through empirical testing, and how they were corrected.

---

## Case Study 1: Correcting Over-Optimistic Initial Alignment & Coverage Scores

### The Initial Flaw
When the diagnostic engine (`backend/services/analysis_engine.py`) was first run against the seeded sample filings for Meta (FY2025), Snap (FY2025), and Pinterest (FY2025), it produced:
- **100.0% Evidence Coverage** across all three companies.
- **88.3% – 92.8% Overall Alignment Scores**, with **0 `Potential Misalignment`** and **0 `Insufficient Evidence`** items for FY2025.

### Why It Was Wrong (Domain & Methodological Critique)
1. The initial chunk-to-requirement relevance filter (`sim_score < 0.18 or (kw_hits == 0 and exp_hits < 2)`) was too permissive: even when an uploaded document excerpt did **not** discuss third-party API/supplier governance (`Business Partners & Suppliers`), generic words like `"governance"` or `"formal"` caused chunks to match every requirement, inflating Evidence Coverage to 100%.
2. The initial negative-polarity detector (`neg_total >= pos_total + 1 and neg_total >= 2`) missed key structural governance weaknesses such as Snap's three-class non-voting Class A stock (`"no voting rights"`, `"concentrating"`) and Meta's dual-class CEO control (`"centralized at the ceo"`).

### The Engineered Correction
1. **Tightened Evidence Relevance Gate:** Updated `analysis_engine.py` to exclude generic stop-terms (`"governance"`, `"oversight"`, `"dedicated"`, `"teams"`) from requirement keyword matching and require `sim_score >= 0.20 and kw_hits >= 1 and exp_hits >= 2`. Unmentioned requirements now strictly evaluate to **`Insufficient Evidence` (`numeric_score = None`)**.
2. **Expanded Structural Gap Lexicon & Threshold:** Added domain-specific structural risk terms (`"no voting rights"`, `"non-voting"`, `"concentrating"`, `"centralized at the ceo"`, `"frequent policy adjustments"`, `"tension"`, `"strain"`) and calibrated Rule A (`neg_total > pos_total and neg_total >= 1`).
3. **Verified Result After Correction:**
   - **Meta FY2024:** Score `34.3%`, Coverage `88.2%` (`1 Strong`, `1 Partial`, `13 Misaligned`, `2 Insufficient Evidence`)
   - **Meta FY2025:** Score `59.8%`, Coverage `77.8%` (`5 Strong`, `3 Partial`, `6 Misaligned`, `4 Insufficient Evidence`)
   - **Snap FY2025:** Score `65.9%`, Coverage `88.9%` (`6 Strong`, `3 Partial`, `7 Misaligned`, `2 Insufficient Evidence`)
   - **Pinterest FY2025:** Score `68.1%`, Coverage `75.0%` (`3 Strong`, `6 Partial`, `3 Misaligned`, `4 Insufficient Evidence`)

---

## Case Study 2: Catching Organizational Unit Regex Mismatches via Automated Pytest

### The Initial Flaw
When running `pytest tests/test_alignment_analyzer.py`, `test_scenario_1_and_2_documented_policy_and_new_governance_mechanism` failed with an `AssertionError`:
- `Audit & Risk Oversight Committee` and `Privacy Governance & Data Protection Function` were not extracted as `OrganizationalUnit` records from Meta's FY2025 filing.

### Root Cause Diagnosis
- The initial regex pattern `r"Audit(?:\s+and\s+Risk)?\s+Committee"` only matched the word `"and"` (not `"&"`) and did not allow `"Oversight"` before `"Committee"`.
- Similarly, `r"Privacy(?:\s+and\s+Data\s+Use)?\s+(?:Committee|Review\s+Board|Program|Team)"` did not match `"Privacy Governance"` or `"Privacy Review"`.

### The Engineered Correction
- Updated the organizational unit extraction patterns in `backend/services/analysis_engine.py` to:
  - `r"Audit(?:\s*(?:and|&)\s*Risk)?(?:\s+Oversight)?\s+Committee"`
  - `r"Privacy\s+(?:Governance|and\s+Data|Review|Program|Committee|Team)"`
- Re-ran `pytest`: all **13/13 automated tests passed**.

---

## Case Study 3: Enforcing the Anti-Hallucination Evidence Validation Gate (Scenario 10)

### The Risk
LLMs can occasionally generate plausible-sounding alignment rationales (`"Strong Alignment"`) while returning an empty `evidence_ids: []` array when no document chunk actually supports the claim.

### The Engineered Safeguard
Implemented a deterministic post-processing gate [`validate_and_create_alignment_assessment`](../backend/services/analysis_engine.py) that inspects every assessment before database persistence:
```python
if classification in {
    "Strong Alignment",
    "Partial Alignment",
    "Potential Misalignment",
} and not evidence_ids:
    classification = "Insufficient Evidence"
    rationale = (
        "[EVIDENCE VALIDATION GATE TRIGGERED] Conclusion had no supporting evidence citations "
        "and was automatically downgraded to Insufficient Evidence."
    )
    numeric_score = None
```
This guarantees that **zero unsupported AI opinions** can ever enter the alignment score calculation.

---

## Case Study 4: Fixing Vercel Serverless Static Bundling & DOM `<select>` Ordering

### The Initial Flaw
1. On Vercel's Python serverless runtime (`@vercel/python`), non-Python files in `frontend/public/` were not traced by `api/index.py`, causing `/` to return the fallback `<h1>` tag instead of the web application.
2. In the custom TypeScript JSX runtime (`frontend/src/lib/react-lite.ts`), element properties (`el.value = v`) were assigned *before* child `<option>` elements were appended to `<select>`, causing dropdown selections to visually reset.

### The Engineered Correction
1. Updated `frontend/build.mjs` to embed `INDEX_HTML` and `BUNDLE_JS` directly into `backend/static_assets.py` as a Python module and mirror them into root `public/`.
2. Reordered `createDomNode` in `frontend/src/lib/react-lite.ts` so child nodes are appended prior to setting `.value` and added input focus/cursor state preservation across re-renders.

---

## Case Study 5: Preventing Invented Quotations & Page Hallucinations via Provenance Verification Gate

### The Risk
When testing LLMs on long corporate filings, LLMs frequently paraphrase passages and attribute them with invented quotation marks or fabricate non-existent page numbers and document titles.

### The Engineered Safeguard
Authored [`backend/services/evidence_validator.py`](../backend/services/evidence_validator.py) providing deterministic two-stage verification:
1. **`verify_quotation_in_chunk(quotation, chunk_content)`**:
   - Performs normalized whitespace, punctuation, and case stripping.
   - Evaluates exact substring matching and token overlap ratio (threshold $\ge 0.70$).
   - Returns `(is_valid, match_ratio, verified_exact_substring)`.
2. **`find_matching_chunk_for_quotation(db, period_id, quotation)`**:
   - Scans the actual database chunks for the assessment period to find the true provenance coordinates (`document_id`, `chunk_id`, `page_number`).
   - If an LLM attempts to claim a quote from page 99 that doesn't exist, the gate rejects the quotation and falls back to verified deterministic chunk extraction.
3. Added automated test `test_evidence_validator_provenance_and_hallucination_rejection` in `tests/test_alignment_analyzer.py` proving that valid quotations pass ($\ge 90\%$ overlap) while hallucinated assertions are rejected with `is_valid == False`.

---

## Case Study 6: Catching Regression during Core AI Engine Integration via Automated Pytest

### The Problem
During Phase 2, `_extract_evidence_via_llm` was initially invoked in `analysis_engine.py` before its function body was defined in that module scope. 

### Detection & Resolution
Running `./.venv/bin/python -m pytest -v tests/test_alignment_analyzer.py` caught this immediately:
```text
FAILED tests/test_alignment_analyzer.py::test_scenario_3_company_claim_without_independent_verification
E       NameError: name '_extract_evidence_via_llm' is not defined
```
The helper function was cleanly defined above `run_full_diagnostic_analysis` with:
- Groq prompt payload preparation and context window economy ($\le 10$ top chunks).
- Pydantic schema validation using `LLMEvidenceList`.
- Automatic quotation provenance verification against database records.
- Re-running `pytest` confirmed that all **15/15 automated tests passed**.


