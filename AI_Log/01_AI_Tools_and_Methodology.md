# 1. AI Tools, Architecture & Division of Responsibility

## 1.1 Overview of AI Usage

In building the **Stakeholder–Structure Alignment Analyzer**, AI was utilized across two distinct dimensions:

| Dimension | Role | Tools / Components |
|---|---|---|
| **1. Development-Time AI (Software Engineering & Architecture)** | Assisted in scaffolding the 15-table normalized SQLAlchemy/PostgreSQL schema, FastAPI REST endpoints, TypeScript frontend components, and automated Pytest verification suite under human architectural direction. | Google Antigravity Agentic Coding Assistant (Gemini model family) |
| **2. Runtime Diagnostic AI (In-Application Analysis Engine)** | Executes the 6-stage organizational diagnostic workflow inside the web application: indexing uploaded filings, retrieving relevant chunks via vector similarity, classifying evidence, mapping stakeholder expectations to organizational structures, diagnosing root causes, and generating recommendations. | Configurable LLM Provider Abstraction (`openai`, `anthropic`, `gemini`, and the deterministic `evidence_engine` fallback) + Hybrid Vector Store (`pgvector` / Cosine RAG) |

---

## 1.2 Human-in-the-Loop Governance & Division of Responsibility

Rather than allowing an LLM to act as an unconstrained "black-box" scorer or generic chatbot, strict boundaries were established between **what AI is allowed to do** and **what is governed by deterministic rules and human oversight**:

1. **Deterministic Mathematical Scoring (No Arbitrary AI Scores):**
   - The AI is **prohibited** from inventing percentage scores.
   - Instead, the AI can only classify an individual requirement into one of five discrete categories (`Strong Alignment`, `Partial Alignment`, `Potential Misalignment`, `Insufficient Evidence`, `Not Applicable`), which must be linked to extracted `EvidenceRecord` IDs.
   - The deterministic scoring engine (`backend/services/scoring_engine.py`) then computes weighted averages using explicit mathematical formulas:
     $$\text{Stakeholder Alignment Score} = \frac{\sum (\text{Requirement Score} \times \text{Requirement Weight})}{\sum (\text{Assessed Applicable Requirement Weights})}$$
     $$\text{Alignment Percentage} = \left(\frac{\text{Weighted Average}}{4}\right) \times 100$$
2. **Distinguishing Evidence Coverage from Alignment:**
   - Missing public disclosure is **never** assigned a zero score (since lack of public disclosure in a 10-K does not prove a company lacks an internal team).
   - Instead, `Insufficient Evidence` items are excluded from the alignment denominator and surfaced transparently via the **Evidence Coverage %** metric:
     $$\text{Evidence Coverage} = \left(\frac{\text{Number of Assessed Applicable Requirements}}{\text{Total Applicable Requirements}}\right) \times 100$$
3. **Skepticism Toward Corporate Self-Reporting (`COMPANY_CLAIM` Rule):**
   - Statements made by a company about its own commitments without independent audit or structural verification are classified as `COMPANY_CLAIM` and **capped at `Partial Alignment` (`3.0`)**, never `Strong Alignment` (`4.0`).
4. **Evaluator Manual Override & Immutable Audit Trail:**
   - Human evaluators retain final authority: any AI-generated classification or stakeholder weight can be overridden in the UI with a mandatory written justification, which is permanently recorded in the `manual_overrides` and `audit_logs` database tables.
