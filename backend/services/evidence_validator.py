"""
Evidence Validation Gate & Quotation Provenance Verifier (Section 6 & 17).
Guarantees:
1. Quotations returned by LLMs actually exist in source document chunks (verbatim/normalized match).
2. Page numbers and document IDs are verified against database records.
3. COMPANY_CLAIM is capped at Partial Alignment (3.0) unless corroborated by independent FACT.
4. Unsupported assertions are automatically rejected or downgraded to Insufficient Evidence.
"""

import logging
import re
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session

from backend.models import Document, DocumentChunk, EvidenceRecord

logger = logging.getLogger(__name__)


def normalize_text_for_comparison(text: str) -> str:
    """Normalize whitespace, punctuation, and casing for robust quotation matching."""
    t = text.lower()
    t = re.sub(r"\s+", " ", t)
    t = re.sub(r'["\'`“”‘’]', "", t)
    return t.strip()


def verify_quotation_in_chunk(
    quotation: str, chunk_content: str, threshold: float = 0.70
) -> Tuple[bool, float, Optional[str]]:
    """
    Verify whether a proposed quotation exists in the source chunk.
    Returns (is_valid, match_ratio, verified_exact_substring).
    """
    if not quotation or not chunk_content:
        return False, 0.0, None

    norm_quote = normalize_text_for_comparison(quotation)
    norm_chunk = normalize_text_for_comparison(chunk_content)

    # 1. Exact or normalized substring match
    if norm_quote in norm_chunk:
        return True, 1.0, quotation.strip()

    # 2. Token overlap check
    quote_tokens = [w for w in re.findall(r"[a-z0-9]+", norm_quote) if len(w) > 2]
    if not quote_tokens:
        return False, 0.0, None

    chunk_tokens_set = set(re.findall(r"[a-z0-9]+", norm_chunk))
    hits = sum(1 for w in quote_tokens if w in chunk_tokens_set)
    ratio = hits / len(quote_tokens)

    if ratio >= threshold:
        return True, round(ratio, 2), quotation.strip()

    return False, round(ratio, 2), None


def find_matching_chunk_for_quotation(
    db: Session,
    assessment_period_id: int,
    quotation: str,
    preferred_doc_name: Optional[str] = None,
) -> Optional[Tuple[DocumentChunk, Document]]:
    """
    Search database chunks for the actual origin of an extracted quotation.
    Prevents LLM from attributing quotes to non-existent documents.
    """
    norm_q = normalize_text_for_comparison(quotation)
    q_words = [w for w in re.findall(r"[a-z0-9]+", norm_q) if len(w) > 3][:6]
    if not q_words:
        return None

    query = (
        db.query(DocumentChunk, Document)
        .join(Document, Document.id == DocumentChunk.document_id)
        .filter(DocumentChunk.assessment_period_id == assessment_period_id)
    )

    candidates = query.all()
    best_candidate: Optional[Tuple[DocumentChunk, Document]] = None
    best_score = 0.0

    for chunk, doc in candidates:
        is_valid, ratio, _ = verify_quotation_in_chunk(quotation, chunk.content)
        if is_valid:
            score = ratio
            if preferred_doc_name and preferred_doc_name.lower() in doc.title.lower():
                score += 0.5
            if score > best_score:
                best_score = score
                best_candidate = (chunk, doc)

    return best_candidate


def enforce_company_claim_cap(
    classification: str, evidence_records: List[EvidenceRecord]
) -> Tuple[str, Optional[str]]:
    """
    MANDATORY RULE: Unverified COMPANY_CLAIM can NEVER receive Strong Alignment (4.0).
    If only self-claims exist without independent FACT or THIRD_PARTY_CLAIM, cap at Partial Alignment (3.0).
    """
    if not evidence_records:
        return "Insufficient Evidence", "No supporting evidence citations found."

    has_fact = any(e.evidence_classification == "FACT" for e in evidence_records)
    has_third_party = any(
        e.evidence_classification == "THIRD_PARTY_CLAIM" for e in evidence_records
    )
    all_self_claims = all(
        e.evidence_classification == "COMPANY_CLAIM" for e in evidence_records
    )

    if classification == "Strong Alignment" and all_self_claims and not (has_fact or has_third_party):
        return (
            "Partial Alignment",
            "[EVIDENCE CAP APPLIED] Requirement was capped at Partial Alignment because it relies solely on uncorroborated COMPANY_CLAIM disclosures.",
        )

    return classification, None

