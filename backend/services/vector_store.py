"""Configurable Embedding Provider and Vector Retrieval Engine (pgvector / FAISS / NumPy)."""

import hashlib
import math
import re
from typing import Dict, List, Optional, Tuple
import numpy as np
from sqlalchemy.orm import Session

from backend.config import settings
from backend.models import DocumentChunk


DOMAIN_CONCEPT_CLUSTERS: Dict[str, List[str]] = {
    "privacy_data": [
        "privacy", "data protection", "gdpr", "personal data", "encryption",
        "consent", "retention", "dpo", "ftc", "surveillance", "anonymization",
    ],
    "safety_moderation": [
        "safety", "moderation", "trust and safety", "community standards",
        "harmful content", "teen", "child", "youth", "integrity", "enforcement",
    ],
    "advertising_monetization": [
        "advertiser", "advertising", "brand safety", "targeting", "roas",
        "measurement", "merchant", "sponsored", "ad load", "monetization",
    ],
    "creator_ecosystem": [
        "creator", "publisher", "revenue share", "spotlight", "reels",
        "demonetization", "visibility", "reach", "partner", "payout",
    ],
    "employee_workforce": [
        "employee", "workforce", "layoff", "restructuring", "compensation",
        "wellbeing", "diversity", "career", "flattening", "headcount",
    ],
    "regulatory_compliance": [
        "regulator", "compliance", "dsa", "digital services act", "dma",
        "audit", "fine", "enforcement", "legal", "statutory", "accountability",
    ],
    "shareholder_governance": [
        "shareholder", "board", "voting", "dual-class", "committee",
        "fiduciary", "profitability", "margin", "capital", "investor",
    ],
    "ai_governance": [
        "artificial intelligence", "ai", "algorithm", "recommendation",
        "llama", "model", "bias", "transparency", "automated",
    ],
    "structure_hierarchy": [
        "hierarchy", "reporting", "ceo", "executive", "layer", "chain of command",
        "centralized", "decentralized", "autonomy", "delegation", "escalation",
    ],
    "coordination_formalization": [
        "cross-functional", "coordination", "policy", "sop", "procedure",
        "framework", "specialization", "dedicated team", "silo",
    ],
}


def compute_embedding(text: str, dim: int = 384) -> List[float]:
    """
    Generate a 384-dimensional normalized embedding vector.
    Uses OpenAI API if configured with an API key, or a deterministic
    Semantic Concept + N-gram Feature Hashing vector representation.
    """
    if settings.embedding_provider == "openai" and settings.openai_api_key:
        try:
            from openai import OpenAI

            client = OpenAI(api_key=settings.openai_api_key)
            resp = client.embeddings.create(
                input=text[:8000], model="text-embedding-3-small", dimensions=dim
            )
            return list(resp.data[0].embedding)
        except Exception:
            pass

    vec = np.zeros(dim, dtype=np.float32)
    lower_text = text.lower()
    tokens = re.findall(r"[a-z0-9]+", lower_text)
    if not tokens:
        return vec.tolist()

    # 1. Domain concept dimensions (slots 0..39)
    for c_idx, (_, keywords) in enumerate(DOMAIN_CONCEPT_CLUSTERS.items()):
        hits = sum(lower_text.count(kw) for kw in keywords)
        if hits > 0:
            vec[c_idx * 3] = float(1.0 + math.log1p(hits))
            vec[c_idx * 3 + 1] = float(hits) / max(10.0, len(tokens))

    # 2. Unigram and bigram feature hashing (slots 40..dim-1)
    usable_dim = dim - 40
    for i, tok in enumerate(tokens):
        if len(tok) < 2:
            continue
        h = int(hashlib.md5(tok.encode("utf-8")).hexdigest()[:8], 16)
        slot = 40 + (h % usable_dim)
        sign = 1.0 if (h & 1) == 0 else -1.0
        vec[slot] += sign * 1.0

        if i + 1 < len(tokens):
            bigram = f"{tok}_{tokens[i+1]}"
            hb = int(hashlib.md5(bigram.encode("utf-8")).hexdigest()[:8], 16)
            slot_b = 40 + (hb % usable_dim)
            sign_b = 1.0 if (hb & 1) == 0 else -1.0
            vec[slot_b] += sign_b * 1.25

    norm = float(np.linalg.norm(vec))
    if norm > 1e-8:
        vec = vec / norm
    return [round(float(x), 6) for x in vec]


def search_relevant_chunks(
    db: Session,
    query: str,
    company_id: int,
    assessment_period_id: Optional[int] = None,
    document_category: Optional[str] = None,
    financial_year: Optional[str] = None,
    top_k: int = 8,
) -> List[Tuple[DocumentChunk, float]]:
    """
    Retrieve the top_k most relevant DocumentChunks filtered by metadata
    (company_id, assessment_period_id, document_category, financial_year),
    using FAISS / cosine vector similarity combined with lexical keyword boost.
    """
    q = db.query(DocumentChunk).filter(DocumentChunk.company_id == company_id)
    if assessment_period_id is not None:
        q = q.filter(DocumentChunk.assessment_period_id == assessment_period_id)
    if document_category:
        q = q.filter(DocumentChunk.document_category == document_category)
    if financial_year:
        q = q.filter(DocumentChunk.financial_year == financial_year)

    candidates = q.all()
    if not candidates:
        return []

    query_vec = np.array(compute_embedding(query, settings.embedding_dimension), dtype=np.float32)
    query_terms = [
        t for t in re.findall(r"[a-z0-9]+", query.lower()) if len(t) > 2
    ]

    matrix_list = []
    for chunk in candidates:
        if chunk.embedding_json and len(chunk.embedding_json) == settings.embedding_dimension:
            matrix_list.append(chunk.embedding_json)
        else:
            emb = compute_embedding(chunk.content, settings.embedding_dimension)
            matrix_list.append(emb)

    mat = np.array(matrix_list, dtype=np.float32)

    # Use FAISS IndexFlatIP if available for inner-product search on normalized vectors
    try:
        import faiss  # type: ignore

        index = faiss.IndexFlatIP(settings.embedding_dimension)
        index.add(mat)
        sims, idxs = index.search(query_vec.reshape(1, -1), len(candidates))
        raw_scores = {int(idxs[0][i]): float(sims[0][i]) for i in range(len(candidates))}
    except Exception:
        dots = mat @ query_vec
        raw_scores = {i: float(dots[i]) for i in range(len(candidates))}

    scored_results: List[Tuple[DocumentChunk, float]] = []
    for idx, chunk in enumerate(candidates):
        sem_score = raw_scores.get(idx, 0.0)
        text_lower = (chunk.section_heading + " " + chunk.content).lower()
        if query_terms:
            lexical_hits = sum(1 for term in query_terms if term in text_lower)
            lexical_score = lexical_hits / len(query_terms)
        else:
            lexical_score = 0.0
        combined_score = round(0.65 * max(0.0, sem_score) + 0.35 * lexical_score, 4)
        scored_results.append((chunk, combined_score))

    scored_results.sort(key=lambda x: x[1], reverse=True)
    return scored_results[:top_k]

