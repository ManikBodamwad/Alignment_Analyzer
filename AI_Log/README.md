# AI Usage, Prompt Engineering & Verification Log (`AI_Log`)

**Project:** Stakeholder–Structure Alignment Analyzer  
**Target Companies Evaluated:** Meta Platforms, Inc. (`META`), Snap Inc. (`SNAP`), Pinterest, Inc. (`PINS`)  
**Repository:** https://github.com/ManikBodamwad/Alignment_Analyzer  

---

## Purpose of This Folder

This `AI_Log/` directory provides a complete, auditable record of how Artificial Intelligence was used, guided, constrained, tested, and verified during the design and development of the **Stakeholder–Structure Alignment Analyzer**.

It separates AI usage into two distinct layers for academic evaluation:
1. **Development-Time AI Assistance (Agentic Pair Programming):** How AI was prompted and directed across 6 phased engineering milestones to architect the full-stack application, database schema, scoring engine, and automated tests—including where initial AI outputs were critically audited, debugged, and corrected.
2. **Runtime Application AI Architecture (Embedded Diagnostic Engine):** How the application itself constrains LLM/RAG reasoning using 10 task-specific system prompts, metadata-aware document chunking, a 4-tier evidence classification standard (`FACT`, `COMPANY_CLAIM`, `THIRD_PARTY_CLAIM`, `INFERENCE`), deterministic mathematical scoring, and anti-hallucination validation gates.

---

## Contents of the `AI_Log/` Directory

| File | Description | Evaluation Focus |
|---|---|---|
| [`01_AI_Tools_and_Methodology.md`](./01_AI_Tools_and_Methodology.md) | Overview of AI tools used, division of responsibility between human judgment and AI generation, and academic integrity statement. | Tool attribution & methodology |
| [`02_Prompt_and_Development_Trajectory.md`](./02_Prompt_and_Development_Trajectory.md) | Chronological log of user prompts, architectural decisions, and iterative refinements across Phases 1–6 and deployment. | Prompt progression & iterative design |
| [`03_Verification_Debugging_and_Human_Oversight.md`](./03_Verification_Debugging_and_Human_Oversight.md) | Detailed case studies of errors/limitations in initial AI outputs that were caught, diagnosed, and corrected through testing. | Critical evaluation & quality control |
| [`04_System_Prompts_and_Guardrails_Catalog.md`](./04_System_Prompts_and_Guardrails_Catalog.md) | Complete catalog of the 10 internal AI system prompts, JSON validation schemas, prompt-injection defenses, and scoring rules. | Prompt engineering & epistemic rigor |
| [`05_Diagnostic_Execution_and_Test_Verification_Log.md`](./05_Diagnostic_Execution_and_Test_Verification_Log.md) | Empirical diagnostic outputs for Meta, Snap, and Pinterest and the 13/13 automated Pytest verification transcript. | Empirical validation & reproducibility |

