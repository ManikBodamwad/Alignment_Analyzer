"""Configurable Embedding Provider and Vector Retrieval Engine (SentenceTransformers / FAISS / Hybrid)."""

import hashlib
import logging
import math
import re
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.orm import Session

from backend.config import settings
from backend.models import DocumentChunk

logger = logging.getLogger(__name__)

# Global singleton cache for local SentenceTransformer model
_LOCAL_MODEL_INSTANCE: Any = None
_LOCAL_MODEL_LOAD_FAILED = False


def get_embedding_engine_status() -> Dict[str, Any]:
    """Report the active embedding model, backend type, and fallback status."""
    global _LOCAL_MODEL_INSTANCE, _LOCAL_MODEL_LOAD_FAILED
    provider = settings.embedding_provider.lower()
    if provider in ("sentence_transformers", "local", "all-minilm-l6-v2"):
        if _LOCAL_MODEL_LOAD_FAILED:
            return {
                "active_backend": "deterministic_feature_hash_fallback",
                "model_name": "Semantic Concept + Feature Hashing (Fallback)",
                "is_fallback": True,
                "dimension": settings.embedding_dimension,
                "reason": "sentence_transformers failed to initialize or download model weights",
            }
        return {
            "active_backend": "sentence_transformers",
            "model_name": settings.embedding_model,
            "is_fallback": False,
            "dimension": settings.embedding_dimension,
            "device": "cpu",
        }
    elif provider == "openai" and settings.openai_api_key:
        return {
            "active_backend": "openai",
            "model_name": "text-embedding-3-small",
            "is_fallback": False,
            "dimension": settings.embedding_dimension,
        }
    return {
        "active_backend": "deterministic_feature_hash_fallback",
        "model_name": "Semantic Concept + N-Gram Feature Hashing",
        "is_fallback": True,
        "dimension": settings.embedding_dimension,
    }


def _get_sentence_transformer_model():
    """Lazy-load the SentenceTransformer model once on first use."""
    global _LOCAL_MODEL_INSTANCE, _LOCAL_MODEL_LOAD_FAILED
    if _LOCAL_MODEL_INSTANCE is not None:
        return _LOCAL_MODEL_INSTANCE
    if _LOCAL_MODEL_LOAD_FAILED:
        return None

    try:
        from sentence_transformers import SentenceTransformer  # type: ignore

        logger.info(f"Loading local SentenceTransformer model: {settings.embedding_model}")
        _LOCAL_MODEL_INSTANCE = SentenceTransformer(settings.embedding_model)
        return _LOCAL_MODEL_INSTANCE
    except Exception as exc:
        logger.warning(
            f"SentenceTransformer initialization failed ({exc}). "
            "Falling back to deterministic semantic feature hashing."
        )
        _LOCAL_MODEL_LOAD_FAILED = True
        return None


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


def _compute_fallback_hashing_embedding(text: str, dim: int = 384) -> List[float]:
    """Deterministic fallback using semantic concept dimensions + MD5 feature hashing."""
    vec = [0.0] * dim
    lower_text = text.lower()
    tokens = re.findall(r"[a-z0-9]+", lower_text)
    if not tokens:
        return vec

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

    norm = math.sqrt(sum(x * x for x in vec))
    if norm > 1e-8:
        vec = [round(x / norm, 6) for x in vec]
    return vec


def compute_embedding(text: str, dim: int = 384) -> List[float]:
    """
    Generate a normalized embedding vector for the given text.
    1. First tries sentence-transformers/all-MiniLM-L6-v2 (local, free, 384-d).
    2. Uses OpenAI if explicitly configured.
    3. Falls back to deterministic semantic feature hashing if local model is unavailable.
    """
    provider = settings.embedding_provider.lower()

    if provider in ("sentence_transformers", "local", "all-minilm-l6-v2", "hybrid_vector"):
        model = _get_sentence_transformer_model()
        if model is not None:
            try:
                emb = model.encode(text[:4000], convert_to_numpy=True, normalize_embeddings=True)
                return [round(float(v), 6) for v in emb.tolist()]
            except Exception as e:
                logger.warning(f"Local sentence-transformers encode error ({e}), falling back to hashing")

    if provider == "openai" and settings.openai_api_key:
        try:
            from openai import OpenAI  # type: ignore

            client = OpenAI(api_key=settings.openai_api_key)
            resp = client.embeddings.create(
                input=text[:8000], model="text-embedding-3-small", dimensions=dim
            )
            return list(resp.data[0].embedding)
        except Exception:
            pass

    return _compute_fallback_hashing_embedding(text, dim)


def _dot_product(a: List[float], b: List[float]) -> float:
    return sum(x * y for x, y in zip(a, b))


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
    using cosine vector similarity combined with lexical keyword boost.
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

    query_vec = compute_embedding(query, settings.embedding_dimension)
    query_terms = [
        t for t in re.findall(r"[a-z0-9]+", query.lower()) if len(t) > 2
    ]

    scored_results: List[Tuple[DocumentChunk, float]] = []
    for chunk in candidates:
        if (
            chunk.embedding_json
            and len(chunk.embedding_json) == settings.embedding_dimension
        ):
            chunk_vec = chunk.embedding_json
        else:
            chunk_vec = compute_embedding(chunk.content, settings.embedding_dimension)

        sem_score = _dot_product(query_vec, chunk_vec)
        text_lower = (chunk.section_heading + " " + chunk.content).lower()
        if query_terms:
            lexical_hits = sum(1 for term in query_terms if term in text_lower)
            lexical_score = lexical_hits / len(query_terms)
        else:
            lexical_score = 0.0
        combined_score = round(
            0.65 * max(0.0, sem_score) + 0.35 * lexical_score, 4
        )
        scored_results.append((chunk, combined_score))

    scored_results.sort(key=lambda x: x[1], reverse=True)
    return scored_results[:top_k]


def build_faiss_index_if_available(chunks: List[DocumentChunk]):
    """Optionally index chunks using FAISS if available for sub-millisecond retrieval."""
    try:
        import faiss  # type: ignore
        import numpy as np  # type: ignore

        vectors = []
        for c in chunks:
            v = c.embedding_json or compute_embedding(c.content)
            vectors.append(v)
        if not vectors:
            return None, []
        dim = len(vectors[0])
        index = faiss.IndexFlatIP(dim)
        data = np.array(vectors, dtype=np.float32)
        faiss.normalize_L2(data)
        index.add(data)
        return index, chunks
    except Exception:
        return None, chunks
