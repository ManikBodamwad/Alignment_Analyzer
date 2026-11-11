"""
Configurable LLM Provider Abstraction with Structured JSON Validation and Auto-Repair.
Supports Groq (llama-3.3-70b-versatile), OpenAI, Anthropic, and the Evidence-Grounded Diagnostic Engine.
"""

import json
import re
import urllib.request
from typing import Any, Dict, List, Optional, Type, TypeVar
from pydantic import BaseModel

from backend.config import settings
from backend.services.prompts import PROMPT_REGISTRY

T = TypeVar("T", bound=BaseModel)


def repair_and_parse_json(raw_text: str) -> Dict[str, Any]:
    """
    Attempt controlled repair of malformed LLM JSON outputs:
    - Strip markdown code fences (```json ... ```)
    - Extract outer JSON object {...}
    - Fix trailing commas before closing braces/brackets
    """
    if not raw_text or not raw_text.strip():
        raise ValueError("Empty response from LLM.")

    cleaned = raw_text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned)

    start_idx = cleaned.find("{")
    end_idx = cleaned.rfind("}")
    if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
        cleaned = cleaned[start_idx : end_idx + 1]

    cleaned = re.sub(r",\s*([}\]])", r"\1", cleaned)
    return json.loads(cleaned)


def validate_structured_output(raw_text: str, schema_cls: Type[T]) -> T:
    """
    Validate raw LLM output against a Pydantic schema, attempting JSON repair
    before raising a validation error.
    """
    try:
        return schema_cls.model_validate_json(raw_text)
    except Exception:
        repaired_dict = repair_and_parse_json(raw_text)
        return schema_cls.model_validate(repaired_dict)


def _call_groq_chat_completion(
    system_prompt: str,
    user_payload: str,
    api_key: str,
    model: str = "llama-3.3-70b-versatile",
    timeout_sec: int = 20,
) -> str:
    """Call Groq's OpenAI-compatible Chat Completions endpoint using stdlib urllib."""
    url = "https://api.groq.com/openai/v1/chat/completions"
    body = {
        "model": model or "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_payload},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.1,
        "max_tokens": 2048,
    }
    data_bytes = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data_bytes,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "Stakeholder-Structure-Alignment-Analyzer/1.0",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
        resp_data = json.loads(resp.read().decode("utf-8"))
        return resp_data["choices"][0]["message"]["content"]


def call_external_llm_json(
    prompt_key: str,
    user_payload: str,
    schema_cls: Optional[Type[T]] = None,
) -> Optional[Dict[str, Any]]:
    """
    Call an external LLM API (Groq, OpenAI, or Anthropic) if configured with an API key.
    Returns None if operating in local 'evidence_engine' mode or if network/API is unreachable.
    """
    system_prompt = PROMPT_REGISTRY.get(prompt_key, "")
    provider = settings.llm_provider.lower()

    if (provider == "groq" or settings.groq_api_key) and settings.groq_api_key:
        try:
            model_name = (
                settings.llm_model
                if "llama" in settings.llm_model or "mixtral" in settings.llm_model or "gemma" in settings.llm_model
                else "llama-3.3-70b-versatile"
            )
            content = _call_groq_chat_completion(
                system_prompt=system_prompt,
                user_payload=user_payload,
                api_key=settings.groq_api_key,
                model=model_name,
            )
            if schema_cls:
                validated = validate_structured_output(content, schema_cls)
                return validated.model_dump()
            return repair_and_parse_json(content)
        except Exception:
            return None

    if provider == "openai" and settings.openai_api_key:
        try:
            from openai import OpenAI  # type: ignore

            client = OpenAI(api_key=settings.openai_api_key)
            resp = client.chat.completions.create(
                model=settings.llm_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_payload},
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
            )
            content = resp.choices[0].message.content or "{}"
            if schema_cls:
                validated = validate_structured_output(content, schema_cls)
                return validated.model_dump()
            return repair_and_parse_json(content)
        except Exception:
            return None

    if provider == "anthropic" and settings.anthropic_api_key:
        try:
            import anthropic  # type: ignore

            client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
            resp = client.messages.create(
                model="claude-3-5-sonnet-latest",
                max_tokens=4096,
                system=system_prompt,
                messages=[{"role": "user", "content": user_payload}],
                temperature=0.1,
            )
            content = resp.content[0].text if resp.content else "{}"
            if schema_cls:
                validated = validate_structured_output(content, schema_cls)
                return validated.model_dump()
            return repair_and_parse_json(content)
        except Exception:
            return None

    return None


def generate_ai_executive_synthesis(
    company_name: str,
    period_title: str,
    overall_score: Optional[float],
    coverage_pct: float,
    evidence_items: List[Dict[str, Any]],
    gap_items: List[Dict[str, Any]],
    custom_question: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Generate an evidence-grounded AI Executive Diagnostic Briefing (and optional targeted Q&A)
    using Groq (llama-3.3-70b-versatile) when configured, with deterministic evidence fallback.
    """
    payload_dict = {
        "company": company_name,
        "assessment_period": period_title,
        "overall_alignment_score_pct": overall_score,
        "evidence_coverage_pct": coverage_pct,
        "custom_evaluator_question": custom_question
        or "Synthesize the primary structural alignment strengths, governance vulnerabilities, and priority reforms.",
        "extracted_evidence_sample": evidence_items[:12],
        "identified_alignment_gaps": gap_items[:8],
    }

    llm_res = call_external_llm_json(
        prompt_key="executive_summary_generation",
        user_payload=json.dumps(payload_dict, indent=2),
    )
    if llm_res and "executive_summary" in llm_res:
        llm_res["provider_used"] = f"Groq ({settings.llm_model})" if settings.groq_api_key else settings.llm_provider
        llm_res.setdefault("targeted_question_response", llm_res["executive_summary"])
        return llm_res

    # Deterministic fallback grounded in extracted evidence
    top_ev = evidence_items[0] if evidence_items else None
    ev_quote = (
        f"Supporting disclosure: \"{top_ev['exact_quotation'][:160]}...\" ({top_ev['document_name']}, p. {top_ev['page_number']})."
        if top_ev
        else "No documentary evidence uploaded yet."
    )
    return {
        "provider_used": "Evidence-Grounded Diagnostic Engine (Deterministic Fallback)",
        "executive_summary": (
            f"{company_name} ({period_title}) achieves an Overall Weighted Alignment Score of "
            f"{overall_score if overall_score is not None else 'N/A'}% with {coverage_pct}% Evidence Coverage. "
            f"{len(gap_items)} structural alignment gap(s) were identified across stakeholder requirements. "
            f"{ev_quote}"
        ),
        "targeted_question_response": (
            f"Regarding '{custom_question or 'Executive Structural Synthesis'}': Based on {len(evidence_items)} extracted evidence record(s), "
            f"{company_name} exhibits {len(gap_items)} structural alignment gap(s). {ev_quote}"
        ),
        "key_strengths": [
            f"Formalized governance and specialized safety/privacy disclosures documented across {len(evidence_items)} evidence record(s).",
            "Clear separation of verified structural facts (FACT) from self-reported company claims (COMPANY_CLAIM).",
        ],
        "key_structural_gaps": [
            g.get("rationale", "Structural alignment gap identified.")
            for g in gap_items[:4]
        ]
        or ["No major misalignment gaps identified in current evidence set."],
        "evidence_limitations_summary": (
            f"Evidence coverage is {coverage_pct}%. Unassessed requirements are excluded from the alignment score denominator, "
            f"and unverified company claims are capped at Partial Alignment."
        ),
    }
