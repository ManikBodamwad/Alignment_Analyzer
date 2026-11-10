"""
6-Stage Evidence-Backed Organizational Diagnostic & Alignment Analysis Engine (Sections 3–10, 17).
"""

from datetime import datetime, timezone
import re
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.orm import Session

from backend.models import (
    AlignmentAssessment,
    AssessmentPeriod,
    Company,
    Document,
    DocumentChunk,
    EvidenceRecord,
    OrganizationalDimension,
    OrganizationalUnit,
    Recommendation,
    Stakeholder,
    StakeholderConflict,
    StakeholderExpectation,
)
from backend.services.scoring_engine import (
    map_classification_to_score,
    recalculate_assessment_scores,
)
from backend.services.vector_store import search_relevant_chunks


DIMENSION_DEFINITIONS: List[Dict[str, Any]] = [
    {
        "code": "hierarchy",
        "name": "Hierarchy & Reporting Lines",
        "keywords": [
            "hierarchy", "reporting", "layer", "chain of command", "reports to",
            "executive oversight", "flattening", "management layer", "ceo", "board",
        ],
    },
    {
        "code": "centralization",
        "name": "Centralization vs. Autonomy",
        "keywords": [
            "centralized", "centralization", "decentralized", "autonomy",
            "executive level", "business unit", "regional", "concentrated",
            "dual-class", "voting control", "founder",
        ],
    },
    {
        "code": "formalization",
        "name": "Formalization & Policy Frameworks",
        "keywords": [
            "formal", "policy", "policies", "procedure", "standard operating",
            "sop", "charter", "guideline", "community standards", "code of conduct",
        ],
    },
    {
        "code": "specialization",
        "name": "Functional Specialization",
        "keywords": [
            "dedicated team", "specialized", "trust and safety", "privacy team",
            "compliance team", "ai governance", "monetization team", "creator team",
            "youth safety", "integrity team",
        ],
    },
    {
        "code": "delegation",
        "name": "Delegation, Authority & Escalation",
        "keywords": [
            "delegation", "authority", "accountability", "escalation",
            "independent oversight", "veto", "ombudsman", "oversight board",
            "chief privacy officer", "data protection officer",
        ],
    },
    {
        "code": "coordination",
        "name": "Cross-Functional Coordination & Integration",
        "keywords": [
            "cross-functional", "coordination", "collaboration", "integration",
            "product and policy", "engineering and legal", "silo", "joint review",
            "gating", "alignment",
        ],
    },
    {
        "code": "governance",
        "name": "Corporate & Risk Governance",
        "keywords": [
            "governance", "board of directors", "audit committee", "risk committee",
            "internal controls", "independent audit", "ethics", "compliance oversight",
            "fiduciary",
        ],
    },
]


STAKEHOLDER_KEYWORDS: Dict[str, List[str]] = {
    "users": [
        "user", "consumer", "privacy", "personal data", "safety", "content moderation",
        "teen", "youth", "child", "feed", "recommendation", "wellbeing", "encryption",
    ],
    "advertisers": [
        "advertiser", "advertising", "brand safety", "targeting", "measurement",
        "roas", "ad load", "merchant", "sponsored", "campaign", "monetization",
    ],
    "employees": [
        "employee", "workforce", "headcount", "layoff", "restructuring", "compensation",
        "workplace", "career", "diversity", "inclusion", "flattening", "retention",
    ],
    "regulators": [
        "regulator", "government", "compliance", "ftc", "gdpr", "dsa",
        "digital services act", "european commission", "statutory", "audit", "fine",
    ],
    "shareholders": [
        "shareholder", "investor", "capital", "profitability", "operating margin",
        "voting", "dual-class", "class b", "class c", "dividend", "buyback", "return",
    ],
    "creators": [
        "creator", "publisher", "monetization", "revenue share", "spotlight",
        "reels", "visibility", "demonetization", "payout", "content partner",
    ],
    "executive_leadership": [
        "executive", "ceo", "cfo", "chief", "senior management", "leadership",
        "operating officer", "strategic execution", "product roadmap",
    ],
    "board_of_directors": [
        "board of directors", "audit committee", "governance committee",
        "independent director", "lead independent", "committee charter", "oversight",
    ],
    "business_partners": [
        "partner", "supplier", "vendor", "cloud", "app store", "merchant",
        "third-party developer", "api", "integration", "supply chain",
    ],
    "society": [
        "society", "community", "public interest", "mental health", "misinformation",
        "sustainability", "esg", "ethical ai", "externalities", "civil rights",
    ],
}


DEFAULT_STAKEHOLDER_BLUEPRINTS: List[Dict[str, Any]] = [
    {
        "name": "Users & Consumers",
        "category": "External",
        "slug": "users",
        "importance_weight": 1.5,
        "influence_level": "High",
        "dependence_level": "High",
        "key_interests": ["Data privacy & protection", "Platform & teen safety", "Algorithmic transparency", "Reliable user experience"],
        "concerns_and_risks": ["Unauthorized data tracking", "Harmful or unsafe content exposure", "Opaque recommendation ranking"],
        "relevant_policies": ["Privacy Policy", "Community Standards / Terms of Service", "Youth Safety Policy"],
        "potential_conflicts": ["Advertisers (Targeting vs. Privacy)", "Shareholders (Ad load vs. User experience)"],
        "expectations": [
            {
                "title": "Personal Data Privacy & Protection Governance",
                "description": "Independent privacy oversight, strict data minimization, and cross-functional privacy review before product launches.",
                "weight": 1.5,
                "dimensions": ["governance", "specialization", "delegation"],
            },
            {
                "title": "Content Safety, Youth Protection & Moderation Integrity",
                "description": "Dedicated safety teams, clear escalation authority, and cross-functional coordination between product, engineering, and policy.",
                "weight": 1.5,
                "dimensions": ["specialization", "coordination", "formalization"],
            },
            {
                "title": "Algorithmic & Recommendation Transparency",
                "description": "Formal governance and user controls over AI-driven content recommendations and feed ranking.",
                "weight": 1.2,
                "dimensions": ["formalization", "governance"],
            },
        ],
    },
    {
        "name": "Advertisers & Merchants",
        "category": "External",
        "slug": "advertisers",
        "importance_weight": 1.3,
        "influence_level": "High",
        "dependence_level": "High",
        "key_interests": ["Audience reach & targeting effectiveness", "Brand safety & adjacency protection", "Verified measurement & ROAS reporting"],
        "concerns_and_risks": ["Ad placement next to harmful content", "Signal loss from privacy changes", "Unverified impression metrics"],
        "relevant_policies": ["Advertising Policies", "Brand Safety Guidelines", "Merchant Terms"],
        "potential_conflicts": ["Users (Granular targeting vs. Data privacy)", "Creators (Ad revenue share allocation)"],
        "expectations": [
            {
                "title": "Brand Safety & Content Adjacency Controls",
                "description": "Specialized brand safety systems and coordination between ad delivery engineering and trust & safety moderation.",
                "weight": 1.4,
                "dimensions": ["coordination", "specialization", "formalization"],
            },
            {
                "title": "Transparent Ad Measurement & Targeting Governance",
                "description": "Accurate third-party verified ad reporting and clear accountability for ad platform policy enforcement.",
                "weight": 1.2,
                "dimensions": ["formalization", "delegation"],
            },
        ],
    },
    {
        "name": "Employees",
        "category": "Internal",
        "slug": "employees",
        "importance_weight": 1.2,
        "influence_level": "Medium",
        "dependence_level": "High",
        "key_interests": ["Fair compensation & job stability", "Manageable workload & psychological safety", "Clear reporting lines & career growth"],
        "concerns_and_risks": ["Workforce restructuring & role ambiguity", "Burnout in safety/moderation teams", "Lack of upward escalation channels"],
        "relevant_policies": ["Code of Conduct", "Workplace & Whistleblower Policy", "Compensation Charter"],
        "potential_conflicts": ["Shareholders (Cost efficiency & flattening vs. Staffing resilience)"],
        "expectations": [
            {
                "title": "Organizational Clarity, Workload Balance & Fair Restructuring",
                "description": "Clear reporting hierarchy, sustainable staffing for critical compliance/safety functions, and structured career pathways.",
                "weight": 1.2,
                "dimensions": ["hierarchy", "specialization", "delegation"],
            },
            {
                "title": "Psychological Safety & Internal Whistleblower Escalation",
                "description": "Formal, retaliation-free escalation channels to independent oversight when employees identify safety or compliance risks.",
                "weight": 1.3,
                "dimensions": ["formalization", "delegation", "governance"],
            },
        ],
    },
    {
        "name": "Governments & Regulators",
        "category": "External",
        "slug": "regulators",
        "importance_weight": 1.5,
        "influence_level": "High",
        "dependence_level": "Low",
        "key_interests": ["Statutory compliance (GDPR, EU DSA, FTC orders)", "Independent risk audits", "Child safety & responsible AI governance"],
        "concerns_and_risks": ["Executive override of compliance controls", "Under-resourced regional compliance teams", "Unverified self-reporting"],
        "relevant_policies": ["Regulatory Compliance Charter", "Transparency Reports", "Data Protection Officer Mandate"],
        "potential_conflicts": ["Executive Leadership (Speed of AI/product shipping vs. Mandatory pre-launch risk gating)"],
        "expectations": [
            {
                "title": "Statutory Compliance & Independent Regulatory Oversight",
                "description": "Board-level compliance oversight, independent statutory audits, and empowered Data Protection / Compliance Officers.",
                "weight": 1.5,
                "dimensions": ["governance", "delegation", "formalization"],
            },
            {
                "title": "Regional Regulatory Autonomy & Cross-Functional Risk Gating",
                "description": "Sufficient regional decision-making authority and mandatory legal/policy sign-off before deploying high-risk AI or platform features.",
                "weight": 1.4,
                "dimensions": ["centralization", "coordination"],
            },
        ],
    },
    {
        "name": "Shareholders & Owners",
        "category": "Internal",
        "slug": "shareholders",
        "importance_weight": 1.3,
        "influence_level": "High",
        "dependence_level": "Medium",
        "key_interests": ["Sustainable revenue growth & operating margin", "Capital allocation discipline", "Board accountability & minority shareholder rights"],
        "concerns_and_risks": ["Multi-class voting concentration limiting minority voice", "Regulatory fines eroding earnings", "Unchecked R&D spend"],
        "relevant_policies": ["Corporate Governance Guidelines", "Audit Committee Charter", "Proxy Statement Disclosures"],
        "potential_conflicts": ["Employees (Margin expansion vs. Headcount investment)", "Users/Regulators (Short-term monetization vs. Safety cost)"],
        "expectations": [
            {
                "title": "Independent Board Oversight & Shareholder Accountability",
                "description": "Effective independent board committees capable of checking executive decision-making and protecting minority shareholders.",
                "weight": 1.4,
                "dimensions": ["governance", "centralization", "hierarchy"],
            },
        ],
    },
    {
        "name": "Creators, Publishers & Content Partners",
        "category": "External",
        "slug": "creators",
        "importance_weight": 1.1,
        "influence_level": "Medium",
        "dependence_level": "High",
        "key_interests": ["Predictable monetization & revenue sharing", "Fair algorithmic distribution", "Transparent moderation appeals"],
        "concerns_and_risks": ["Sudden demonetization or payout program changes", "Unexplained reach throttling", "Lack of dedicated partner support"],
        "relevant_policies": ["Creator Monetization Terms", "Partner Program Policies", "Appeals Procedure"],
        "potential_conflicts": ["Users (Organic content quality vs. Aggressive creator monetization)", "Trust & Safety (Borderline content takedowns)"],
        "expectations": [
            {
                "title": "Transparent Creator Monetization & Appeal Mechanisms",
                "description": "Dedicated creator partnership teams, predictable payout governance, and structured appeal procedures for content enforcement.",
                "weight": 1.2,
                "dimensions": ["specialization", "formalization", "coordination"],
            },
        ],
    },
    {
        "name": "Senior Management & Executive Leadership",
        "category": "Internal",
        "slug": "executive_leadership",
        "importance_weight": 1.1,
        "influence_level": "High",
        "dependence_level": "Medium",
        "key_interests": ["Strategic agility & rapid product execution", "Unified product/AI roadmap", "Operational efficiency"],
        "concerns_and_risks": ["Bureaucratic review bottlenecks", "Fragmented business-unit execution"],
        "relevant_policies": ["Executive Committee Charter", "Operating Principles"],
        "potential_conflicts": ["Regulators (Rapid innovation vs. Pre-launch compliance delays)"],
        "expectations": [
            {
                "title": "Streamlined Executive Decision-Making & Cross-Unit Alignment",
                "description": "Clear chain of command and rapid coordination across core product, AI, and monetization engineering units.",
                "weight": 1.1,
                "dimensions": ["hierarchy", "centralization", "coordination"],
            },
        ],
    },
    {
        "name": "Board of Directors",
        "category": "Internal",
        "slug": "board_of_directors",
        "importance_weight": 1.2,
        "influence_level": "High",
        "dependence_level": "Low",
        "key_interests": ["Enterprise risk visibility", "Fiduciary oversight", "Executive succession & audit integrity"],
        "concerns_and_risks": ["Information asymmetry between management and board", "Delayed escalation of regulatory/safety breaches"],
        "relevant_policies": ["Board Committee Charters", "Enterprise Risk Management Framework"],
        "potential_conflicts": ["Founder/Executive Leadership (Independent oversight vs. Concentrated founder control)"],
        "expectations": [
            {
                "title": "Direct Risk Reporting & Committee Oversight Independence",
                "description": "Unfiltered reporting lines from Audit, Compliance, and Risk leaders directly to independent Board committees.",
                "weight": 1.3,
                "dimensions": ["governance", "hierarchy", "delegation"],
            },
        ],
    },
    {
        "name": "Business Partners & Suppliers",
        "category": "External",
        "slug": "business_partners",
        "importance_weight": 0.9,
        "influence_level": "Medium",
        "dependence_level": "Medium",
        "key_interests": ["Stable API & commerce integrations", "Clear vendor governance", "Timely contractual dispute resolution"],
        "concerns_and_risks": ["Sudden platform API deprecation", "Fragmented partner management"],
        "relevant_policies": ["Developer & Partner Terms", "Supplier Code of Conduct"],
        "potential_conflicts": ["Users (Third-party data sharing vs. User privacy restrictions)"],
        "expectations": [
            {
                "title": "Partner Ecosystem Governance & Third-Party Risk Controls",
                "description": "Formalized vendor/partner management teams and technical governance over third-party API and merchant integrations.",
                "weight": 1.0,
                "dimensions": ["formalization", "specialization"],
            },
        ],
    },
    {
        "name": "Society & Communities",
        "category": "External",
        "slug": "society",
        "importance_weight": 1.1,
        "influence_level": "Medium",
        "dependence_level": "Medium",
        "key_interests": ["Responsible AI & civic integrity", "Youth mental health protection", "Environmental & social accountability"],
        "concerns_and_risks": ["Systemic amplification of misinformation or youth harm", "Externalized societal costs"],
        "relevant_policies": ["Responsible AI Framework", "ESG & Sustainability Report", "Human Rights Policy"],
        "potential_conflicts": ["Shareholders/Executives (Engagement maximization vs. Societal externality mitigation)"],
        "expectations": [
            {
                "title": "Responsible AI Governance & Societal Impact Oversight",
                "description": "Dedicated ethical AI review mechanisms, independent advisory input, and transparent reporting on systemic societal risks.",
                "weight": 1.2,
                "dimensions": ["governance", "specialization", "coordination"],
            },
        ],
    },
]


def ensure_baseline_framework(db: Session, period: AssessmentPeriod) -> None:
    """
    Ensure the assessment period has the 10 standard stakeholder groups (4 Internal, 6 External),
    their baseline expectations, and the 7 organizational structure dimensions initialized.
    """
    existing_sh = (
        db.query(Stakeholder)
        .filter(Stakeholder.assessment_period_id == period.id)
        .all()
    )
    if not existing_sh:
        for bp in DEFAULT_STAKEHOLDER_BLUEPRINTS:
            sh = Stakeholder(
                company_id=period.company_id,
                assessment_period_id=period.id,
                name=bp["name"],
                category=bp["category"],
                slug=bp["slug"],
                importance_weight=bp["importance_weight"],
                influence_level=bp["influence_level"],
                dependence_level=bp["dependence_level"],
                key_interests=bp["key_interests"],
                concerns_and_risks=bp["concerns_and_risks"],
                relevant_policies=bp["relevant_policies"],
                potential_conflicts=bp["potential_conflicts"],
                alignment_score=None,
                evidence_coverage_pct=0.0,
            )
            db.add(sh)
            db.flush()

            for exp_bp in bp["expectations"]:
                exp = StakeholderExpectation(
                    stakeholder_id=sh.id,
                    assessment_period_id=period.id,
                    title=exp_bp["title"],
                    description=exp_bp["description"],
                    requirement_weight=exp_bp["weight"],
                    priority_category="Core Requirement",
                    is_discovered_from_docs=False,
                    mapped_dimension_codes=exp_bp["dimensions"],
                )
                db.add(exp)

    existing_dims = (
        db.query(OrganizationalDimension)
        .filter(OrganizationalDimension.assessment_period_id == period.id)
        .all()
    )
    if not existing_dims:
        for d_def in DIMENSION_DEFINITIONS:
            dim = OrganizationalDimension(
                assessment_period_id=period.id,
                dimension_code=d_def["code"],
                dimension_name=d_def["name"],
                suitability_classification="Insufficient Evidence",
                assessment_summary="No documents have been analyzed yet for this organizational dimension.",
                strengths=[],
                weaknesses=[],
                evidence_count=0,
                confidence_level="Low",
            )
            db.add(dim)

    db.commit()


def classify_sentence_evidence_type(
    sentence: str, doc_category: str, doc_title: str
) -> Tuple[str, str, float, Dict[str, float]]:
    """
    Classify an extracted document sentence into:
    - FACT
    - COMPANY_CLAIM
    - THIRD_PARTY_CLAIM
    - INFERENCE
    And calculate a separate evidence quality score and 5-part breakdown.
    """
    s_lower = sentence.lower()
    cat_lower = (doc_category + " " + doc_title).lower()

    # Detect Third-Party / Regulatory / Independent Research Claims
    third_party_markers = [
        "independent audit", "regulator", "ftc", "european commission",
        "digital services act", "oversight board", "third-party", "researchers found",
        "external assessment", "enforcement action", "independent review",
        "whistleblower", "complaint", "consent decree", "independent report",
    ]
    if any(m in cat_lower for m in ["regulatory", "independent", "audit", "third-party", "oversight"]) or any(
        m in s_lower for m in third_party_markers
    ):
        ev_class = "THIRD_PARTY_CLAIM"
        reliability = 0.90
        independence = 0.95
    # Detect Company Self-Claims (aspirational, self-reported, unverified assertions)
    elif any(
        m in s_lower
        for m in [
            "we strive", "we believe", "our commitment", "company claims",
            "we aim to", "designed to", "we continue to invest", "our goal is",
            "publicly announced", "self-reported", "we are committed",
        ]
    ):
        ev_class = "COMPANY_CLAIM"
        reliability = 0.68
        independence = 0.35
    # Detect Verifiable Structural Facts (charters, committees, reporting lines, voting structure)
    elif any(
        m in s_lower
        for m in [
            "committee", "board of directors", "reports to", "reporting line",
            "class b", "class c", "voting power", "charter", "form 10-k",
            "proxy statement", "headcount", "chief", "division", "department",
            "established", "comprises", "consists of",
        ]
    ):
        ev_class = "FACT"
        reliability = 0.92
        independence = 0.78
    else:
        ev_class = "COMPANY_CLAIM"
        reliability = 0.72
        independence = 0.45

    specificity = min(0.98, 0.60 + (0.08 * len(re.findall(r"\b[A-Z][a-zA-Z]+\b", sentence))))
    recency = 0.90
    relevance = 0.85
    quality_score = round(
        (0.25 * reliability)
        + (0.25 * independence)
        + (0.15 * recency)
        + (0.20 * specificity)
        + (0.15 * relevance),
        2,
    )
    confidence = "High" if quality_score >= 0.80 else ("Medium" if quality_score >= 0.65 else "Low")
    breakdown = {
        "source_reliability": round(reliability, 2),
        "source_independence": round(independence, 2),
        "recency": round(recency, 2),
        "specificity": round(specificity, 2),
        "relevance": round(relevance, 2),
    }
    return ev_class, confidence, quality_score, breakdown


def _sentiment_polarity(text: str) -> Tuple[int, int]:
    """Return (positive_structural_signals, negative_gap_signals) in a passage."""
    t = text.lower()
    pos_terms = [
        "independent oversight", "dedicated team", "board committee", "direct reporting",
        "mandatory review", "cross-functional gating", "verified audit", "charter mandates",
        "clear authority", "binding", "proactively prohibit", "privacy-by-design",
        "parental supervision", "default teen", "inclusive",
    ]
    neg_terms = [
        "insufficient", "lack of", "fragmented", "override", "centralized control",
        "conflict", "bottleneck", "reduced headcount", "layoff", "silo",
        "unverified", "no independent", "limited authority", "violation", "fine",
        "delayed", "gap", "weakness", "concern", "criticism", "without independent",
        "no voting rights", "non-voting", "concentrating", "centralized at the ceo",
        "limited to specific", "frequent policy adjustments", "partial alignment",
        "tension", "strain", "competing", "transitioned several",
    ]
    pos = sum(1 for p in pos_terms if p in t)
    neg = sum(1 for n in neg_terms if n in t)
    return pos, neg


def run_full_diagnostic_analysis(
    db: Session, assessment_period_id: int
) -> Dict[str, Any]:
    """
    Execute the complete 6-stage organizational alignment diagnostic pipeline
    for the given AssessmentPeriod using only documents uploaded to that period.
    """
    period = (
        db.query(AssessmentPeriod)
        .filter(AssessmentPeriod.id == assessment_period_id)
        .first()
    )
    if not period:
        raise ValueError(f"AssessmentPeriod {assessment_period_id} not found.")

    company = db.query(Company).filter(Company.id == period.company_id).first()
    ensure_baseline_framework(db, period)

    # Clear prior auto-generated evidence, non-overridden assessments, conflicts, units, recommendations
    db.query(EvidenceRecord).filter(
        EvidenceRecord.assessment_period_id == period.id
    ).delete()
    db.query(OrganizationalUnit).filter(
        OrganizationalUnit.assessment_period_id == period.id
    ).delete()
    db.query(StakeholderConflict).filter(
        StakeholderConflict.assessment_period_id == period.id
    ).delete()
    db.query(Recommendation).filter(
        Recommendation.assessment_period_id == period.id
    ).delete()
    db.query(AlignmentAssessment).filter(
        AlignmentAssessment.assessment_period_id == period.id,
        AlignmentAssessment.is_overridden == False,  # noqa: E712
    ).delete()
    db.commit()

    # Check active processed documents for this assessment period
    docs = (
        db.query(Document)
        .filter(
            Document.assessment_period_id == period.id,
            Document.is_archived == False,  # noqa: E712
            Document.processing_status == "completed",
        )
        .all()
    )
    doc_map = {d.id: d for d in docs}

    chunks = (
        db.query(DocumentChunk)
        .filter(DocumentChunk.assessment_period_id == period.id)
        .all()
    )

    stakeholders = (
        db.query(Stakeholder)
        .filter(Stakeholder.assessment_period_id == period.id)
        .all()
    )
    sh_by_slug = {s.slug: s for s in stakeholders}
    sh_by_id = {s.id: s for s in stakeholders}

    dimensions = (
        db.query(OrganizationalDimension)
        .filter(OrganizationalDimension.assessment_period_id == period.id)
        .all()
    )
    dim_by_code = {d.dimension_code: d for d in dimensions}

    # If no chunks exist, set everything to Insufficient Evidence
    if not chunks:
        expectations = (
            db.query(StakeholderExpectation)
            .filter(StakeholderExpectation.assessment_period_id == period.id)
            .all()
        )
        for exp in expectations:
            primary_dim = (
                exp.mapped_dimension_codes[0]
                if exp.mapped_dimension_codes
                else "governance"
            )
            aa = AlignmentAssessment(
                assessment_period_id=period.id,
                stakeholder_id=exp.stakeholder_id,
                expectation_id=exp.id,
                organizational_dimension=primary_dim,
                mapped_mechanisms=[],
                classification="Insufficient Evidence",
                numeric_score=None,
                requirement_weight=exp.requirement_weight,
                rationale="Insufficient Evidence: No processed company documents are available in this assessment period to evaluate this requirement.",
                root_cause_diagnosis=["Insufficient public or uploaded documentary evidence."],
                evidence_ids=[],
                evidence_quality_score=0.0,
                is_overridden=False,
            )
            db.add(aa)
        db.commit()
        scores = recalculate_assessment_scores(db, period.id)
        return {
            "status": "completed_no_documents",
            "evidence_extracted": 0,
            "scores": scores,
        }

    # =========================================================================
    # STAGE 1: Discover Additional Company-Specific Expectations from Documents
    # =========================================================================
    _discover_expectations_from_chunks(db, period, chunks, sh_by_slug, company)

    # =========================================================================
    # STAGE 2 & 3: Extract Evidence Records & Organizational Structure Units
    # =========================================================================
    expectations = (
        db.query(StakeholderExpectation)
        .filter(StakeholderExpectation.assessment_period_id == period.id)
        .all()
    )

    created_evidence: List[EvidenceRecord] = []

    for exp in expectations:
        sh = sh_by_id.get(exp.stakeholder_id)
        if not sh:
            continue
        query_str = f"{sh.name} {exp.title} {exp.description}"
        retrieved = search_relevant_chunks(
            db=db,
            query=query_str,
            company_id=period.company_id,
            assessment_period_id=period.id,
            top_k=4,
        )

        # Filter to chunks with meaningful relevance and keyword overlap
        sh_keywords = STAKEHOLDER_KEYWORDS.get(sh.slug, [])
        exp_words = [
            w.lower()
            for w in re.findall(r"[a-zA-Z]{4,}", exp.title + " " + exp.description)
            if w.lower()
            not in {
                "with", "from", "that", "this", "between", "clear", "formal",
                "dedicated", "teams", "governance", "oversight", "Before",
                "before", "across", "direct", "independent", "structured",
            }
        ]

        for chunk, sim_score in retrieved:
            c_lower = (chunk.section_heading + " " + chunk.content).lower()
            kw_hits = sum(1 for kw in sh_keywords if kw in c_lower)
            exp_hits = sum(1 for w in exp_words if w in c_lower)
            if sim_score < 0.20 or kw_hits == 0 or exp_hits < 2:
                continue

            doc = doc_map.get(chunk.document_id)
            doc_title = doc.title if doc else "Uploaded Document"
            doc_cat = doc.category if doc else "General Disclosure"

            # Extract the best matching sentence/passage as verbatim quotation
            sentences = [
                s.strip()
                for s in re.split(r"(?<=[.!?])\s+|\n+", chunk.content)
                if len(s.strip()) > 25
            ]
            if not sentences:
                sentences = [chunk.content.strip()]

            best_sent = max(
                sentences,
                key=lambda s: sum(1 for w in (sh_keywords + exp_words) if w in s.lower()),
            )

            ev_class, conf, q_score, q_breakdown = classify_sentence_evidence_type(
                best_sent, doc_cat, doc_title
            )
            primary_dim = (
                exp.mapped_dimension_codes[0]
                if exp.mapped_dimension_codes
                else "governance"
            )

            ev = EvidenceRecord(
                company_id=period.company_id,
                assessment_period_id=period.id,
                document_id=chunk.document_id,
                chunk_id=chunk.id,
                stakeholder_id=sh.id,
                expectation_id=exp.id,
                organizational_dimension=primary_dim,
                extracted_statement=f"[{sh.name} — {exp.title}] {best_sent[:260]}",
                exact_quotation=best_sent,
                document_name=doc_title,
                page_number=chunk.page_number,
                section_heading=chunk.section_heading,
                source_url=chunk.source_url,
                publication_date=chunk.publication_date,
                financial_year=chunk.financial_year,
                evidence_classification=ev_class,
                confidence_level=conf,
                quality_score=q_score,
                quality_breakdown=q_breakdown,
                is_contradictory=False,
            )
            db.add(ev)
            created_evidence.append(ev)

    db.flush()

    # Extract Organizational Units & Evaluate the 7 Organizational Structure Dimensions
    _extract_organizational_structure_and_units(
        db, period, chunks, doc_map, dim_by_code, created_evidence
    )

    # =========================================================================
    # STAGE 4 & 5: Requirement-to-Structure Mapping, Alignment & Root-Cause
    # =========================================================================
    existing_overridden_exp_ids = {
        a.expectation_id
        for a in db.query(AlignmentAssessment)
        .filter(
            AlignmentAssessment.assessment_period_id == period.id,
            AlignmentAssessment.is_overridden == True,  # noqa: E712
        )
        .all()
    }

    for exp in expectations:
        if exp.id in existing_overridden_exp_ids:
            continue

        exp_evs = [e for e in created_evidence if e.expectation_id == exp.id]
        primary_dim = (
            exp.mapped_dimension_codes[0]
            if exp.mapped_dimension_codes
            else "governance"
        )

        if not exp_evs:
            # Strictly Insufficient Evidence when no supporting evidence exists
            aa = AlignmentAssessment(
                assessment_period_id=period.id,
                stakeholder_id=exp.stakeholder_id,
                expectation_id=exp.id,
                organizational_dimension=primary_dim,
                mapped_mechanisms=[],
                classification="Insufficient Evidence",
                numeric_score=None,
                requirement_weight=exp.requirement_weight,
                rationale=(
                    f"Insufficient Evidence: Uploaded documents for {period.title} do not contain "
                    f"verifiable structural disclosures addressing '{exp.title}'."
                ),
                root_cause_diagnosis=[
                    "Insufficient public or uploaded documentary evidence for this organizational capability."
                ],
                evidence_ids=[],
                evidence_quality_score=0.0,
                is_overridden=False,
            )
            db.add(aa)
            continue

        # Detect contradictory evidence across extracted records for this expectation
        pos_total = 0
        neg_total = 0
        has_fact = any(e.evidence_classification == "FACT" for e in exp_evs)
        has_third_party = any(e.evidence_classification == "THIRD_PARTY_CLAIM" for e in exp_evs)
        only_company_claims = all(e.evidence_classification == "COMPANY_CLAIM" for e in exp_evs)

        for e in exp_evs:
            p, n = _sentiment_polarity(e.exact_quotation)
            pos_total += p
            neg_total += n

        is_contradictory = (pos_total > 0 and neg_total > 0) or (
            any(e.evidence_classification == "COMPANY_CLAIM" for e in exp_evs)
            and has_third_party
            and neg_total > 0
        )
        if is_contradictory:
            for e in exp_evs:
                e.is_contradictory = True

        # Identify mapped organizational mechanisms from quotations
        mechanisms = _extract_mechanisms_from_evidence(exp_evs, primary_dim)
        avg_quality = round(
            sum(e.quality_score for e in exp_evs) / len(exp_evs), 2
        )

        # Determine Alignment Classification using transparent rules:
        # Rule A: Strong negative/gap signals or regulatory/structural failure -> Potential Misalignment
        if neg_total > pos_total and neg_total >= 1:
            classification = "Potential Misalignment"
            root_causes = _infer_root_causes(exp_evs, primary_dim, is_misaligned=True)
            rationale = (
                f"Potential Misalignment identified across {len(exp_evs)} evidence record(s). "
                f"While {mechanisms[0] if mechanisms else 'governance policies'} are referenced, "
                f"documentary evidence indicates structural constraints or unresolved gaps: "
                f"\"{exp_evs[0].exact_quotation[:180]}...\" ({exp_evs[0].document_name}, p. {exp_evs[0].page_number})."
            )
        # Rule B: Only unverified COMPANY_CLAIM without independent FACT or THIRD_PARTY verification -> Partial Alignment (Cap at 3.0)
        elif only_company_claims:
            classification = "Partial Alignment"
            root_causes = [
                "[INFERENCE] Reliance on self-reported company claims without independent structural or audit verification.",
                "Lack of independently verified operational outcome metrics in public disclosures.",
            ]
            rationale = (
                f"Partial Alignment: Supported only by self-reported COMPANY_CLAIM disclosures "
                f"without independent structural verification. Per diagnostic rules, company claims "
                f"are not treated as independently verified outcomes: \"{exp_evs[0].exact_quotation[:180]}...\" "
                f"({exp_evs[0].document_name}, p. {exp_evs[0].page_number})."
            )
        # Rule C: Contradictory evidence between company policy claims and operational/third-party findings -> Partial Alignment
        elif is_contradictory:
            classification = "Partial Alignment"
            root_causes = _infer_root_causes(exp_evs, primary_dim, is_misaligned=False)
            rationale = (
                f"Partial Alignment due to contradictory or mixed evidence across {len(exp_evs)} source(s). "
                f"Formal mechanisms ({', '.join(mechanisms[:2])}) exist, but countervailing evidence notes implementation friction "
                f"or competing structural priorities ({exp_evs[0].document_name}, p. {exp_evs[0].page_number})."
            )
        # Rule D: Verified structural FACT / independent verification with positive structural support -> Strong Alignment
        elif (has_fact or has_third_party) and pos_total >= neg_total:
            classification = "Strong Alignment"
            root_causes = []
            rationale = (
                f"Strong Alignment supported by {len(exp_evs)} verified evidence record(s) including established "
                f"structural mechanisms ({', '.join(mechanisms[:3])}): \"{exp_evs[0].exact_quotation[:180]}...\" "
                f"({exp_evs[0].document_name}, p. {exp_evs[0].page_number})."
            )
        else:
            classification = "Partial Alignment"
            root_causes = _infer_root_causes(exp_evs, primary_dim, is_misaligned=False)
            rationale = (
                f"Partial Alignment: Organizational mechanisms ({', '.join(mechanisms[:2])}) are partially documented, "
                f"but cross-functional authority or independent escalation remains only partially specified "
                f"({exp_evs[0].document_name}, p. {exp_evs[0].page_number})."
            )

        ev_ids = [e.id for e in exp_evs]

        # Validation Gate (Scenario 10): Never store an aligned conclusion without supporting evidence IDs
        aa = validate_and_create_alignment_assessment(
            assessment_period_id=period.id,
            stakeholder_id=exp.stakeholder_id,
            expectation_id=exp.id,
            organizational_dimension=primary_dim,
            mapped_mechanisms=mechanisms,
            classification=classification,
            requirement_weight=exp.requirement_weight,
            rationale=rationale,
            root_cause_diagnosis=root_causes,
            evidence_ids=ev_ids,
            evidence_quality_score=avg_quality,
        )
        db.add(aa)

    db.flush()

    # =========================================================================
    # STAGE 5B: Stakeholder Conflict Identification
    # =========================================================================
    _generate_stakeholder_conflicts(db, period, sh_by_slug, created_evidence)

    # =========================================================================
    # STAGE 6: Specific, Actionable Recommendations Generation
    # =========================================================================
    _generate_recommendations(db, period, sh_by_id)

    period.status = "completed"
    period.last_analyzed_at = datetime.now(timezone.utc)
    db.commit()

    scores = recalculate_assessment_scores(db, period.id)
    return {
        "status": "completed",
        "documents_analyzed": len(docs),
        "chunks_indexed": len(chunks),
        "evidence_extracted": len(created_evidence),
        "scores": scores,
    }


def validate_and_create_alignment_assessment(
    assessment_period_id: int,
    stakeholder_id: int,
    expectation_id: int,
    organizational_dimension: str,
    mapped_mechanisms: List[str],
    classification: str,
    requirement_weight: float,
    rationale: str,
    root_cause_diagnosis: List[str],
    evidence_ids: List[int],
    evidence_quality_score: float,
) -> AlignmentAssessment:
    """
    Validation Gate (Section 6 & Scenario 10):
    If an AI-generated conclusion claims Strong/Partial/Potential Misalignment
    but has no supporting evidence_ids, automatically downgrade it to
    'Insufficient Evidence' with numeric_score=None.
    """
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
        root_cause_diagnosis = ["No supporting documentary evidence linked to conclusion."]
        evidence_quality_score = 0.0

    numeric_score = map_classification_to_score(classification)
    return AlignmentAssessment(
        assessment_period_id=assessment_period_id,
        stakeholder_id=stakeholder_id,
        expectation_id=expectation_id,
        organizational_dimension=organizational_dimension,
        mapped_mechanisms=mapped_mechanisms,
        classification=classification,
        numeric_score=numeric_score,
        requirement_weight=requirement_weight,
        rationale=rationale,
        root_cause_diagnosis=root_cause_diagnosis,
        evidence_ids=evidence_ids,
        evidence_quality_score=evidence_quality_score,
        is_overridden=False,
    )


def _discover_expectations_from_chunks(
    db: Session,
    period: AssessmentPeriod,
    chunks: List[DocumentChunk],
    sh_by_slug: Dict[str, Stakeholder],
    company: Optional[Company],
) -> None:
    """Discover company-specific stakeholder expectations directly from uploaded documents."""
    combined_text = " ".join(c.content.lower() for c in chunks)
    existing_titles = {
        e.title.lower()
        for e in db.query(StakeholderExpectation)
        .filter(StakeholderExpectation.assessment_period_id == period.id)
        .all()
    }

    discovery_patterns = [
        (
            "users",
            ["teen", "youth", "parental", "family center", "minor"],
            "Teen & Minor Protection Controls and Parental Supervision Governance",
            "Dedicated youth safety engineering, default teen privacy protections, and parental supervision tools backed by policy enforcement.",
            1.5,
            ["specialization", "formalization", "coordination"],
        ),
        (
            "society",
            ["llama", "generative ai", "open-weight", "foundation model", "augmented reality", "ar lens"],
            "Generative AI & Immersive Technology Safety Governance",
            "Cross-functional red-teaming, model release gating, and board-level risk oversight for generative AI and AR systems.",
            1.4,
            ["governance", "coordination", "specialization"],
        ),
        (
            "advertisers",
            ["visual discovery", "shop", "merchant", "catalog", "checkout", "positive environment"],
            "Brand-Safe Visual Commerce & Merchant Catalog Integrity",
            "Coordination between merchant onboarding, ad relevance ranking, and positive-intent content moderation.",
            1.3,
            ["specialization", "coordination", "formalization"],
        ),
        (
            "shareholders",
            ["dual-class", "class b", "class c", "voting power", "founder control"],
            "Dual-Class Voting Structure Counterbalance & Independent Governance",
            "Robust Lead Independent Director authority and independent Audit/Governance committees to balance concentrated founder voting control.",
            1.4,
            ["centralization", "governance", "delegation"],
        ),
    ]

    for slug, triggers, title, desc, weight, dims in discovery_patterns:
        if title.lower() in existing_titles:
            continue
        if any(t in combined_text for t in triggers) and slug in sh_by_slug:
            sh = sh_by_slug[slug]
            new_exp = StakeholderExpectation(
                stakeholder_id=sh.id,
                assessment_period_id=period.id,
                title=title,
                description=desc,
                requirement_weight=weight,
                priority_category=f"Discovered ({company.name if company else 'Company'} Priority)",
                is_discovered_from_docs=True,
                mapped_dimension_codes=dims,
            )
            db.add(new_exp)
            existing_titles.add(title.lower())
    db.flush()


def _extract_organizational_structure_and_units(
    db: Session,
    period: AssessmentPeriod,
    chunks: List[DocumentChunk],
    doc_map: Dict[int, Document],
    dim_by_code: Dict[str, OrganizationalDimension],
    created_evidence: List[EvidenceRecord],
) -> None:
    """
    Evaluate all 7 organizational dimensions and extract explicitly disclosed OrganizationalUnits.
    Never invents reporting lines: uses 'Insufficient Evidence' when reporting lines are not stated.
    """
    unit_patterns = [
        (
            r"Audit(?:\s*(?:and|&)\s*Risk)?(?:\s+Oversight)?\s+Committee",
            "Audit & Risk Oversight Committee",
            "Board Committee",
            "governance",
            "Board of Directors",
            "Oversees financial reporting, internal controls, cybersecurity, and statutory compliance risks.",
        ),
        (
            r"Privacy\s+(?:Governance|and\s+Data|Review|Program|Committee|Team)",
            "Privacy Governance & Data Protection Function",
            "Oversight Body",
            "specialization",
            "Chief Privacy Officer / Legal & Compliance",
            "Conducts privacy impact reviews, monitors regulatory compliance, and enforces data protection controls.",
        ),
        (
            r"Trust\s+and\s+Safety|Integrity\s+and\s+Safety|Safety\s+Advisory\s+Council",
            "Trust, Safety & Content Integrity Organization",
            "Operational Team",
            "specialization",
            "VP of Trust & Safety / Policy & Operations",
            "Enforces community standards, youth safety protections, and harmful content moderation.",
        ),
        (
            r"Oversight\s+Board",
            "Independent Content Oversight Board",
            "Oversight Body",
            "delegation",
            "Independent Trust Structure",
            "Reviews appealed content moderation decisions and issues policy recommendations.",
        ),
        (
            r"Responsible\s+AI|AI\s+Safety|AI\s+Governance",
            "AI Governance & Responsible Innovation Council",
            "Executive Function",
            "coordination",
            "Executive Leadership / Product & Engineering",
            "Coordinates model safety evaluations, algorithmic fairness reviews, and product release gating.",
        ),
        (
            r"Creator\s+Partnerships|Spotlight\s+Monetization|Partner\s+Operations",
            "Creator & Publisher Ecosystem Operations",
            "Operational Team",
            "specialization",
            "Insufficient Evidence",
            "Manages creator onboarding, monetization programs, revenue sharing, and partner support.",
        ),
    ]

    seen_units = set()
    for chunk in chunks:
        for pat, u_name, u_type, d_code, default_rep, resp in unit_patterns:
            if u_name in seen_units:
                continue
            if re.search(pat, chunk.content, re.IGNORECASE):
                seen_units.add(u_name)
                dim_obj = dim_by_code.get(d_code)
                # Check if reporting line is explicitly mentioned in chunk
                rep_line = default_rep
                if "reports to" not in chunk.content.lower() and "board" not in u_type.lower():
                    rep_line = "Insufficient Evidence (Reporting line not explicitly disclosed in filing)"
                unit = OrganizationalUnit(
                    assessment_period_id=period.id,
                    dimension_id=dim_obj.id if dim_obj else None,
                    unit_name=u_name,
                    unit_type=u_type,
                    reporting_line=rep_line,
                    responsibilities=resp,
                    authority_scope="Disclosed in " + chunk.section_heading,
                    source_document_id=chunk.document_id,
                    evidence_classification="FACT",
                )
                db.add(unit)

    # Assess each of the 7 dimensions based on retrieved chunks
    for d_def in DIMENSION_DEFINITIONS:
        code = d_def["code"]
        dim = dim_by_code.get(code)
        if not dim:
            continue

        matching_chunks = [
            c
            for c in chunks
            if any(kw in (c.section_heading + " " + c.content).lower() for kw in d_def["keywords"])
        ]
        dim_evs = [e for e in created_evidence if e.organizational_dimension == code]
        ev_count = max(len(matching_chunks), len(dim_evs))
        dim.evidence_count = ev_count

        if ev_count == 0:
            dim.suitability_classification = "Insufficient Evidence"
            dim.assessment_summary = (
                f"Insufficient Evidence: Uploaded documents do not contain explicit disclosures "
                f"regarding {d_def['name']}."
            )
            dim.strengths = []
            dim.weaknesses = ["Lack of public disclosure on internal structure for this dimension."]
            dim.confidence_level = "Low"
            continue

        combined_dim_text = " ".join(c.content for c in matching_chunks)
        pos, neg = _sentiment_polarity(combined_dim_text)

        if neg > pos + 1:
            dim.suitability_classification = "Potential Misalignment"
            dim.confidence_level = "High" if ev_count >= 2 else "Medium"
        elif pos > neg and any(e.evidence_classification == "FACT" for e in dim_evs):
            dim.suitability_classification = "Strong Alignment"
            dim.confidence_level = "High"
        else:
            dim.suitability_classification = "Partial Alignment"
            dim.confidence_level = "Medium"

        dim.assessment_summary = (
            f"Evaluated across {ev_count} documentary disclosure(s). "
            f"Classification: {dim.suitability_classification}. "
            f"Evidence indicates formal mechanisms exist alongside structural trade-offs in {d_def['name'].lower()}."
        )
        dim.strengths = [
            f"Documented disclosures across {ev_count} section(s) addressing {d_def['name']}.",
            "Formal governance or operational mechanisms identified in company filings.",
        ]
        dim.weaknesses = (
            [
                "Tension between centralized executive speed and independent functional escalation.",
                "Partial reliance on company self-reporting for operational effectiveness.",
            ]
            if dim.suitability_classification != "Strong Alignment"
            else ["Continued monitoring required as regulatory and AI complexity scales."]
        )


def _extract_mechanisms_from_evidence(
    evs: List[EvidenceRecord], primary_dim: str
) -> List[str]:
    mechanisms = []
    combined = " ".join(e.exact_quotation for e in evs)
    candidates = [
        ("Audit & Risk Committee", r"audit.*committee|risk.*committee"),
        ("Chief Privacy Officer / Privacy Review", r"privacy.*officer|privacy.*program|dpo|gdpr"),
        ("Trust & Safety Operations", r"trust\s+and\s+safety|moderation|community\s+standards|integrity"),
        ("Independent Oversight Board", r"oversight\s+board|independent\s+audit|advisory\s+council"),
        ("AI Governance & Release Gating", r"ai\s+governance|responsible\s+ai|model\s+review|algorithmic"),
        ("Dual-Class Governance Structure", r"dual-class|class\s+b|class\s+c|voting\s+control"),
        ("Cross-Functional Product-Policy Review", r"cross-functional|product.*policy|engineering.*legal"),
        ("Creator & Advertiser Policy Framework", r"brand\s+safety|monetization|spotlight|creator\s+fund"),
    ]
    for label, pat in candidates:
        if re.search(pat, combined, re.IGNORECASE):
            mechanisms.append(label)
    if not mechanisms:
        mechanisms.append(f"{primary_dim.capitalize()} Governance Mechanism")
    return mechanisms


def _infer_root_causes(
    evs: List[EvidenceRecord], primary_dim: str, is_misaligned: bool
) -> List[str]:
    text = " ".join(e.exact_quotation.lower() for e in evs)
    causes = []
    if "dual-class" in text or "voting" in text or "centralized" in text or "ceo" in text:
        causes.append(
            "[INFERENCE] Excessive centralization of strategic and voting authority at the executive/founder level."
        )
    if "layoff" in text or "flattening" in text or "restructuring" in text or "headcount" in text:
        causes.append(
            "[INFERENCE] Workforce restructuring and management layer reduction straining specialized compliance/safety bandwidth."
        )
    if "silo" in text or "coordination" in text or "override" in text or "speed" in text:
        causes.append(
            "[INFERENCE] Weak cross-functional coordination or asymmetrical authority between revenue/product teams and safety/policy units."
        )
    if not causes:
        if is_misaligned:
            causes.append(
                f"[INFERENCE] Structural authority and independent oversight in '{primary_dim}' are insufficient to enforce stakeholder commitments."
            )
        else:
            causes.append(
                f"[INFERENCE] Partial evidence of independent verification and escalation autonomy within '{primary_dim}'."
            )
    return causes


def _generate_stakeholder_conflicts(
    db: Session,
    period: AssessmentPeriod,
    sh_by_slug: Dict[str, Stakeholder],
    created_evidence: List[EvidenceRecord],
) -> None:
    """Identify and store evidence-linked Stakeholder Conflicts (Section 9)."""
    all_ev_ids = [e.id for e in created_evidence]

    conflict_specs = [
        (
            "users",
            "advertisers",
            "User Data Privacy & Signal Minimization vs. Advertiser Precision Targeting & Attribution",
            ["Privacy Governance Team", "Ads Monetization Engineering", "Legal & Compliance"],
            "Privacy-enhancing technologies (PETs), contextual ad targeting, and pre-launch privacy review gates.",
            "Ads engineering KPIs prioritize conversion recovery and monetization yield, creating structural pressure on default data minimization.",
            "Establish a joint Privacy–Monetization Architecture Board where the Chief Privacy Officer holds binding sign-off authority on ad-targeting changes.",
            "Critical",
        ),
        (
            "creators",
            "users",
            "Creator Engagement & Monetization Velocity vs. User Content Safety & Feed Quality",
            ["Creator Partnerships", "Recommendation AI Engineering", "Trust & Safety Operations"],
            "Automated content classifiers, borderline content demotion policies, and monetization eligibility thresholds.",
            "Engagement-driven recommendation models can amplify sensational content faster than human policy teams calibrate enforcement rules.",
            "Integrate real-time Trust & Safety integrity multipliers directly into creator payout and recommendation ranking objective functions.",
            "High",
        ),
        (
            "employees",
            "shareholders",
            "Employee Workload Sustainability & Specialized Staffing vs. Shareholder Operating Margin & Flattening",
            ["Executive Leadership", "Human Resources", "Board Compensation & Audit Committees"],
            "Efficiency restructuring initiatives, automated moderation tooling, and performance-based equity allocation.",
            "Management flattening and headcount reductions can erode specialized institutional capacity in regional compliance and safety review.",
            "Require Board Risk Committee impact assessments before executing workforce reductions in statutory compliance, privacy, or youth safety units.",
            "High",
        ),
        (
            "regulators",
            "executive_leadership",
            "Regulatory Compliance & Pre-Launch Risk Audits vs. Rapid AI/AR Product Innovation Speed",
            ["AI Product Engineering", "Global Affairs & Legal", "Board Audit & Risk Committee"],
            "Internal responsible AI review checklists and regional regulatory compliance teams.",
            "Product launch timelines driven by executive leadership can outpace thorough cross-functional red-teaming and regional regulatory sign-off.",
            "Mandate an independent Stage-Gate Release Authority co-chaired by Legal/Compliance and Safety Engineering with power to pause high-risk launches.",
            "Critical",
        ),
    ]

    for (
        slug_a,
        slug_b,
        conflict_desc,
        units,
        current_mech,
        weakness,
        rec_mech,
        severity,
    ) in conflict_specs:
        sh_a = sh_by_slug.get(slug_a)
        sh_b = sh_by_slug.get(slug_b)
        if not sh_a or not sh_b:
            continue
        linked_evs = [
            e.id
            for e in created_evidence
            if e.stakeholder_id in {sh_a.id, sh_b.id}
        ][:4] or all_ev_ids[:2]

        conflict = StakeholderConflict(
            assessment_period_id=period.id,
            stakeholder_a_id=sh_a.id,
            stakeholder_b_id=sh_b.id,
            stakeholder_a_name=sh_a.name,
            stakeholder_b_name=sh_b.name,
            conflicting_expectations=conflict_desc,
            organizational_units_involved=units,
            current_resolution_mechanisms=current_mech,
            structural_weaknesses=weakness,
            recommended_governance_mechanism=rec_mech,
            severity=severity,
            evidence_ids=linked_evs,
        )
        db.add(conflict)
    db.flush()


def _generate_recommendations(
    db: Session,
    period: AssessmentPeriod,
    sh_by_id: Dict[int, Stakeholder],
) -> None:
    """
    Generate concrete, specific structural and governance recommendations (Section 7 Stage 6)
    for every Potential Misalignment and Partial Alignment finding.
    """
    assessments = (
        db.query(AlignmentAssessment)
        .filter(AlignmentAssessment.assessment_period_id == period.id)
        .all()
    )
    expectations = {
        e.id: e
        for e in db.query(StakeholderExpectation)
        .filter(StakeholderExpectation.assessment_period_id == period.id)
        .all()
    }

    action_templates: Dict[str, Tuple[str, str, str]] = {
        "governance": (
            "Establish Independent Board Risk & Compliance Charter with Direct Functional Reporting",
            "Amend the Board Risk & Audit Committee charter so the Chief Privacy Officer, Head of Trust & Safety, and Chief Compliance Officer have a dual solid-line reporting channel directly to independent directors, with quarterly unedited risk briefings.",
            "May increase board committee review cadence and require additional independent director technical specialization.",
        ),
        "centralization": (
            "Devolve Regional Statutory Compliance Authority & Counterbalance Executive Voting Concentration",
            "Grant regional EU/UK/US compliance leads autonomous budget and feature-hold authority for local statutory requirements (DSA/GDPR/FTC), and institute a Lead Independent Director veto over related-party or high-risk governance overrides.",
            "Slightly reduces uniform global product rollout speed across jurisdictions.",
        ),
        "specialization": (
            "Ring-Fence Specialized Youth Safety, Privacy & AI Red-Teaming Headcount",
            "Create structurally ring-fenced organizational units for Youth Safety Engineering, Privacy Architecture, and AI Red-Teaming whose budgets and headcount cannot be reallocated to commercial product units without Board Risk Committee approval.",
            "Increases fixed operational overhead in safety and compliance cost centers.",
        ),
        "coordination": (
            "Institute Mandatory Cross-Functional Product–Policy–Safety Stage-Gate Reviews",
            "Replace advisory cross-functional syncs with a binding Stage-Gate Release Protocol requiring formal sign-off from Trust & Safety, Privacy Engineering, and Legal prior to shipping ranking algorithm or ad-targeting updates.",
            "Adds 1–2 weeks of pre-deployment validation latency for major model and ad-system releases.",
        ),
        "delegation": (
            "Grant Binding Stop-Launch Escalation Authority to Safety & Privacy Officers",
            "Codify explicit delegation of authority enabling senior Privacy and Integrity leads to halt or roll back product experiments that breach safety or data-protection thresholds without requiring CEO override approval.",
            "Requires clear quantitative threshold definitions to prevent escalation gridlock.",
        ),
        "formalization": (
            "Transition Self-Reported Policy Commitments to Independently Audited SOPs",
            "Convert internal safety, brand-adjacency, and creator-appeal guidelines into auditable Standard Operating Procedures subject to annual third-party assurance under SOC-2 / EU DSA audit standards.",
            "Entails recurring external audit costs and stricter documentation compliance for engineering teams.",
        ),
        "hierarchy": (
            "Clarify Post-Restructuring Reporting Lines & Functional Accountability Matrix",
            "Publish an explicit RACI accountability matrix across flattened management layers to eliminate ambiguity between core product engineering leads and horizontal risk/compliance functions.",
            "Requires ongoing maintenance during organizational re-allocations.",
        ),
    }

    for aa in assessments:
        if aa.classification not in {"Potential Misalignment", "Partial Alignment"}:
            continue
        exp = expectations.get(aa.expectation_id)
        sh = sh_by_id.get(aa.stakeholder_id)
        if not exp or not sh:
            continue

        dim_code = aa.organizational_dimension
        title_prefix, structural_change, tradeoffs = action_templates.get(
            dim_code, action_templates["governance"]
        )

        priority = (
            "Critical"
            if aa.classification == "Potential Misalignment" and sh.importance_weight >= 1.4
            else (
                "High"
                if aa.classification == "Potential Misalignment"
                else ("Medium" if sh.importance_weight >= 1.2 else "Low")
            )
        )
        difficulty = "High" if priority in {"Critical", "High"} else "Medium"

        rec = Recommendation(
            assessment_period_id=period.id,
            stakeholder_id=sh.id,
            alignment_assessment_id=aa.id,
            organizational_dimension=dim_code,
            title=f"{title_prefix} ({sh.name})",
            identified_issue=f"[{aa.classification}] {exp.title}: {aa.rationale}",
            suggested_organizational_change=structural_change,
            expected_benefit=(
                f"Resolves structural gap for {sh.name} on '{exp.title}', improving verifiable "
                f"governance accountability and reducing regulatory/stakeholder misalignment risk."
            ),
            priority=priority,
            implementation_difficulty=difficulty,
            possible_tradeoffs=tradeoffs,
            status="Proposed",
            evidence_ids=aa.evidence_ids,
        )
        db.add(rec)
    db.flush()
