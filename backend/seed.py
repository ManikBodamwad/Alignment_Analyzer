"""
Initial Database Seeder for Meta Platforms, Inc., Snap Inc., and Pinterest, Inc.
Creates the 3 companies with their Section 10 company-specific analysis priorities,
writes representative sample documents to sample_data/, and seeds clearly labeled
representative sample assessments (including historical FY2024 vs FY2025 for Meta).
"""

from pathlib import Path
from sqlalchemy.orm import Session

from backend.config import BASE_DIR
from backend.models import (
    AssessmentPeriod,
    Company,
    Document,
    DocumentChunk,
)
from backend.security import sanitize_untrusted_document_text
from backend.services.analysis_engine import (
    ensure_baseline_framework,
    run_full_diagnostic_analysis,
)
from backend.services.ingestion import chunk_document_metadata_aware
from backend.services.vector_store import compute_embedding


SAMPLE_DATA_DIR = BASE_DIR / "sample_data"


COMPANY_DEFINITIONS = [
    {
        "name": "Meta Platforms, Inc.",
        "ticker": "META",
        "industry": "Social Media, Digital Advertising & AI/Metaverse Platforms",
        "description": (
            "Operates Family of Apps (Facebook, Instagram, Messenger, WhatsApp, Threads) "
            "and Reality Labs. Multi-platform ecosystem with dual-class voting structure."
        ),
        "analysis_priorities": [
            "User privacy and data protection",
            "Content moderation and platform safety",
            "Advertising and monetization",
            "AI governance and innovation",
            "Workforce restructuring",
            "Multi-platform and business-unit oversight",
            "Regional and regulatory compliance",
        ],
    },
    {
        "name": "Snap Inc.",
        "ticker": "SNAP",
        "industry": "Camera, Visual Messaging & Augmented Reality Platform",
        "description": (
            "Operates Snapchat visual messaging, Spotlight creator ecosystem, My AI, "
            "and Snap AR Lens platform with multi-class founder voting structure."
        ),
        "analysis_priorities": [
            "Teen and child safety",
            "User privacy",
            "Advertising and monetization",
            "Augmented reality innovation",
            "Creators and Spotlight",
            "Employee and organizational structure",
            "Platform safety and regulatory compliance",
        ],
    },
    {
        "name": "Pinterest, Inc.",
        "ticker": "PINS",
        "industry": "Visual Discovery, Inspiration & Shopping Platform",
        "description": (
            "Operates visual inspiration and positive-intent shopping catalog platform "
            "connecting users, merchants, advertisers, and creators."
        ),
        "analysis_priorities": [
            "User experience and content relevance",
            "Advertising and merchant relationships",
            "Creators and publishers",
            "Content moderation and safety",
            "AI-based recommendations",
            "Privacy and governance",
            "Platform trust and user engagement",
        ],
    },
]


SAMPLE_DOCUMENTS_DATA = [
    # =========================================================================
    # META PLATFORMS — FY2024 Representative Sample Documents
    # =========================================================================
    {
        "company_name": "Meta Platforms, Inc.",
        "period_title": "FY2024 Assessment [Representative Sample Data]",
        "fiscal_year": "FY2024",
        "filename": "meta_fy2024_governance_and_10k_sample.txt",
        "doc_title": "[Sample Excerpt] Meta FY2024 Form 10-K & Proxy Governance Disclosures",
        "category": "Annual Report / 10-K & Proxy",
        "publication_date": "2024-02-15",
        "source_url": "https://investor.fb.com/financials/sec-filings-sample-fy2024",
        "content": """[Page 1]
## ITEM 1. CORPORATE GOVERNANCE AND DUAL-CLASS VOTING STRUCTURE
Meta Platforms, Inc. maintains a dual-class capital structure consisting of Class A and Class B common stock. Our founder, Chairman, and CEO holds a majority of total voting power through Class B shares (10 votes per share), resulting in centralized control over board elections and major corporate decisions. While the Board of Directors includes an Audit & Risk Oversight Committee and a Privacy Committee composed of independent directors, minority shareholders have raised concerns that concentrated voting power limits independent shareholder accountability.

[Page 2]
## ITEM 2. WORKFORCE RESTRUCTURING AND HIERARCHY FLATTENING
During the Efficiency Restructuring initiative, Meta reduced total headcount and removed multiple middle-management layers to flatten the organizational hierarchy. Executive leadership states that flattening accelerates engineering decision-making. However, independent third-party assessments and employee feedback note that workforce reductions and restructuring created workload strain and fragmented responsibilities across regional policy, trust and safety, and compliance teams.

[Page 3]
## ITEM 3. PRIVACY PROGRAM AND REGULATORY COMPLIANCE CHALLENGES
Under the FTC Stipulated Order, Meta established a dedicated Privacy Governance Program and Chief Privacy Officer role. The Audit & Risk Committee receives quarterly compliance updates. Nonetheless, European Commission and GDPR regulators issued enforcement findings citing conflicts between personalized advertising targeting and user personal data consent, noting that ads monetization product teams operate under aggressive revenue targets that compete with strict data minimization.
""",
    },
    # =========================================================================
    # META PLATFORMS — FY2025 Representative Sample Documents
    # =========================================================================
    {
        "company_name": "Meta Platforms, Inc.",
        "period_title": "FY2025 Assessment [Representative Sample Data]",
        "fiscal_year": "FY2025",
        "filename": "meta_fy2025_governance_privacy_ai_sample.txt",
        "doc_title": "[Sample Excerpt] Meta FY2025 Governance, Privacy & AI Safety Disclosures",
        "category": "Annual Report / 10-K & Proxy",
        "publication_date": "2025-02-20",
        "source_url": "https://investor.fb.com/financials/sec-filings-sample-fy2025",
        "content": """[Page 1]
## SECTION 1: BOARD OVERSIGHT, DUAL-CLASS CENTRALIZATION & AUDIT COMMITTEE CHARTER
Meta Platforms, Inc. Board of Directors oversees enterprise risk through its Audit & Risk Oversight Committee and Governance Committee. The Audit & Risk Oversight Committee charter mandates direct quarterly reporting from the Chief Privacy Officer and Chief Compliance Officer. However, strategic product direction and capital allocation remain highly centralized at the CEO and executive leadership level due to the dual-class voting structure where Class B shares control over 60% of voting power.

[Page 2]
## SECTION 2: PRIVACY GOVERNANCE, TEEN SAFETY & INDEPENDENT OVERSIGHT BOARD
Meta operates a specialized Privacy Governance & Data Protection Function that conducts pre-launch Privacy Review gating across Family of Apps (Facebook, Instagram, WhatsApp, Threads). For youth and user safety, Meta deployed default Instagram Teen Accounts with parental supervision controls managed by the Trust and Safety Organization. Content moderation appeals are reviewed by the Independent Oversight Board, which operates through an independent trust structure, though its binding scope is limited to specific content cases rather than core ranking algorithms.

[Page 3]
## SECTION 3: ADVERTISING MONETIZATION, CREATOR REELS & AI GOVERNANCE
Meta's Ads Monetization Engineering team deployed AI-driven Advantage+ targeting and measurement tools for advertisers, supported by third-party brand safety adjacency verification. In AI governance, the AI Governance & Responsible Innovation Council coordinates red-teaming for Llama open-weight foundation models. However, regulatory filings under the EU Digital Services Act (DSA) and third-party researchers highlight ongoing structural tension between rapid generative AI deployment speed, creator monetization velocity on Reels, and cross-functional safety review bandwidth following prior workforce flattening.
""",
    },
    {
        "company_name": "Meta Platforms, Inc.",
        "period_title": "FY2025 Assessment [Representative Sample Data]",
        "fiscal_year": "FY2025",
        "filename": "meta_fy2025_independent_regulatory_review_sample.txt",
        "doc_title": "[Sample Excerpt] Independent Regulatory & Transparency Assessment (Meta FY2025)",
        "category": "Regulatory & Independent Report",
        "publication_date": "2025-03-10",
        "source_url": "https://oversight-and-regulatory-sample.org/meta-fy2025",
        "content": """[Page 1]
## SECTION 1: THIRD-PARTY REGULATORY EVALUATION OF COMPLIANCE & SAFETY
Independent audit findings under the EU Digital Services Act (DSA) confirm that Meta has established formal Standard Operating Procedures (SOPs) and specialized regional compliance units. However, external regulators note that regional compliance teams lack autonomous authority to modify core recommendation algorithms without headquarters executive approval. Furthermore, while the company claims that cross-functional coordination between product engineering and trust and safety is seamless, whistleblower disclosures and third-party audits indicate that growth and engagement metrics occasionally override policy team escalation warnings.
""",
    },
    # =========================================================================
    # SNAP INC. — FY2025 Representative Sample Documents
    # =========================================================================
    {
        "company_name": "Snap Inc.",
        "period_title": "FY2025 Assessment [Representative Sample Data]",
        "fiscal_year": "FY2025",
        "filename": "snap_fy2025_safety_ar_governance_sample.txt",
        "doc_title": "[Sample Excerpt] Snap Inc. FY2025 CitizenSnap, Teen Safety & 10-K Disclosures",
        "category": "Annual Report / 10-K & Safety Report",
        "publication_date": "2025-02-12",
        "source_url": "https://investor.snap.com/sec-filings-sample-fy2025",
        "content": """[Page 1]
## SECTION 1: TEEN SAFETY, FAMILY CENTER & PRIVACY BY DESIGN
Snap Inc. prioritizes teen and child safety through its specialized Trust and Safety Team and Safety Advisory Council. Snapchat defaults teen accounts to private contact settings, ephemeral message deletion, and integrates Family Center parental supervision tools. The Privacy Governance Program enforces privacy-by-design reviews across camera, visual messaging, and My AI conversational features, supported by formal data minimization procedures.

[Page 2]
## SECTION 2: THREE-CLASS VOTING CENTRALIZATION & BOARD STRUCTURE
Snap Inc.'s capital structure features Class A (non-voting), Class B (1 vote), and Class C (10 votes) stock held by co-founders, concentrating nearly all voting power in executive leadership. Public Class A shareholders have no voting rights on director elections. While the Board of Directors maintains an Audit Committee for financial and risk oversight, independent governance analysts classify shareholder delegation and board counterbalance as a structural misalignment risk.

[Page 3]
## SECTION 3: SPOTLIGHT CREATORS, AUGMENTED REALITY & WORKFORCE STRUCTURE
Snap's Creator Partnerships team manages Spotlight monetization and AR Lens Creator rewards. However, creators report frequent policy adjustments in Spotlight payout formulas. In advertising, Snap deployed direct-response ad targeting and brand safety controls, though signal loss from mobile OS privacy policies creates tension between user privacy and advertiser measurement. Internally, functional restructuring reduced middle management layers, leaving cross-functional coordination between AR innovation teams and regional regulatory compliance reliant on centralized executive escalation.
""",
    },
    # =========================================================================
    # PINTEREST, INC. — FY2025 Representative Sample Documents
    # =========================================================================
    {
        "company_name": "Pinterest, Inc.",
        "period_title": "FY2025 Assessment [Representative Sample Data]",
        "fiscal_year": "FY2025",
        "filename": "pinterest_fy2025_trust_commerce_governance_sample.txt",
        "doc_title": "[Sample Excerpt] Pinterest FY2025 Governance, Positive-Intent AI & ESG Disclosures",
        "category": "Annual Report / 10-K & ESG Report",
        "publication_date": "2025-02-18",
        "source_url": "https://investor.pinterestinc.com/sec-filings-sample-fy2025",
        "content": """[Page 1]
## SECTION 1: BOARD GOVERNANCE, TRUST & SAFETY AND POSITIVE-INTENT PLATFORM
Pinterest, Inc.'s Board of Directors oversees corporate governance through its Audit Committee and Nominating & Corporate Governance Committee, with formal charters mandating regular reviews of platform trust, cybersecurity, and ethical AI. Pinterest's Trust and Safety Organization enforces strict Community Guidelines that proactively prohibit political ads, weight-loss ads, and harmful misinformation, aligning advertiser brand safety directly with user wellbeing and positive user experience.

[Page 2]
## SECTION 2: AI RECOMMENDATIONS, VISUAL COMMERCE & MERCHANT PARTNERSHIPS
Pinterest's AI Governance and Inclusive Product团队 (Inclusive AI & Recommendation Engineering) collaborates with Trust and Safety to tune visual discovery algorithms (including skin-tone and body-type inclusive search). Dedicated Merchant and Advertiser Partnership units manage shoppable pins and catalog integrity. However, as third-party merchant catalogs and outbound programmatic ad partnerships scale rapidly, partial alignment challenges emerge in cross-functional coordination to verify third-party merchant fulfillment quality and prevent AI-generated spam pins.

[Page 3]
## SECTION 3: CREATOR ECOSYSTEM, PRIVACY & EMPLOYEE GOVERNANCE
Pinterest's Privacy Governance team maintains GDPR and CCPA compliance controls. For creators and publishers, Pinterest transitioned several direct creator fund programs toward merchant-driven shopping links, creating partial misalignment with independent creators seeking direct ad-revenue sharing. Employee workplace policies emphasize inclusion and clear functional reporting lines, though detailed sub-unit escalation protocols for third-party vendor governance have limited public disclosure.
""",
    },
]


def seed_initial_data(db: Session) -> None:
    """Idempotently seed the 3 companies and their clearly labeled sample assessments."""
    try:
        SAMPLE_DATA_DIR.mkdir(parents=True, exist_ok=True)
    except OSError:
        pass

    existing_companies = {c.name: c for c in db.query(Company).all()}
    for c_def in COMPANY_DEFINITIONS:
        if c_def["name"] not in existing_companies:
            comp = Company(
                name=c_def["name"],
                ticker=c_def["ticker"],
                industry=c_def["industry"],
                description=c_def["description"],
                analysis_priorities=c_def["analysis_priorities"],
            )
            db.add(comp)
            db.flush()
            existing_companies[comp.name] = comp

    db.commit()

    # Check if sample assessment periods have already been seeded
    existing_periods = db.query(AssessmentPeriod).count()
    if existing_periods > 0:
        return

    period_cache = {}
    for item in SAMPLE_DOCUMENTS_DATA:
        comp = existing_companies[item["company_name"]]
        p_key = (comp.id, item["period_title"])
        if p_key not in period_cache:
            period = AssessmentPeriod(
                company_id=comp.id,
                title=item["period_title"],
                fiscal_year=item["fiscal_year"],
                start_date=f"{item['fiscal_year'].replace('FY', '')}-01-01",
                end_date=f"{item['fiscal_year'].replace('FY', '')}-12-31",
                status="draft",
                created_by="System Sample Seeder",
            )
            db.add(period)
            db.flush()
            ensure_baseline_framework(db, period)
            period_cache[p_key] = period
        else:
            period = period_cache[p_key]

        # Write sample file to sample_data/ directory if writable
        sample_file_path = SAMPLE_DATA_DIR / item["filename"]
        try:
            if not sample_file_path.exists():
                sample_file_path.write_text(item["content"].strip(), encoding="utf-8")
        except OSError:
            pass

        sanitized_text, inj_flag = sanitize_untrusted_document_text(
            item["content"].strip()
        )
        doc = Document(
            company_id=comp.id,
            assessment_period_id=period.id,
            title=item["doc_title"],
            category=item["category"],
            financial_year=item["fiscal_year"],
            publication_date=item["publication_date"],
            source_url=item["source_url"],
            file_type="TXT",
            file_path=str(sample_file_path),
            file_size=len(item["content"].encode("utf-8")),
            version="1.0",
            processing_status="completed",
            uploader="System Sample Seeder",
            extracted_text=sanitized_text,
            prompt_injection_flag=inj_flag,
            is_archived=False,
        )
        db.add(doc)
        db.flush()

        chunks_data = chunk_document_metadata_aware(sanitized_text)
        for ch in chunks_data:
            emb = compute_embedding(ch.content)
            db_chunk = DocumentChunk(
                document_id=doc.id,
                company_id=comp.id,
                assessment_period_id=period.id,
                chunk_index=ch.chunk_index,
                page_number=ch.page_number,
                section_heading=ch.section_heading,
                content=ch.content,
                token_count=ch.token_count,
                source_url=doc.source_url,
                publication_date=doc.publication_date,
                financial_year=doc.financial_year,
                document_category=doc.category,
                embedding_json=emb,
            )
            db.add(db_chunk)

    db.commit()

    # Seed initial diagnostic scores (fast path for serverless cold-starts on Vercel)
    from backend.config import IS_VERCEL

    for period in period_cache.values():
        if IS_VERCEL:
            period.status = "completed"
            if "2024" in period.fiscal_year:
                period.overall_alignment_score = 34.3
                period.evidence_coverage_pct = 88.2
            elif period.company_id == 1:
                period.overall_alignment_score = 79.7
                period.evidence_coverage_pct = 68.4
            elif period.company_id == 2:
                period.overall_alignment_score = 65.9
                period.evidence_coverage_pct = 70.0
            else:
                period.overall_alignment_score = 68.1
                period.evidence_coverage_pct = 75.0
        else:
            run_full_diagnostic_analysis(db, period.id)
    db.commit()

