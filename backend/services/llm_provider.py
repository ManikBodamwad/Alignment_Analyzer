"""
Configurable LLM Provider Abstraction with Structured JSON Validation and Auto-Repair.
Supports Groq (llama-3.3-70b-versatile), OpenAI, Anthropic, and the Evidence-Grounded Diagnostic Engine.
Includes Exponential Backoff Retry, Rate Limit & Timeout Exception Classification, and Content-Hash Stage Caching.
"""

import hashlib
import json
import logging
import re
import time
import urllib.error
import urllib.request
from typing import Any, Dict, List, Optional, Type, TypeVar
from pydantic import BaseModel

from backend.config import settings
from backend.services.prompts import PROMPT_REGISTRY

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


class LLMProviderError(Exception):
    """Base exception for LLM provider failures."""
    pass


class MissingAPIKeyError(LLMProviderError):
    pass


class InvalidAPIKeyError(LLMProviderError):
    pass


class RateLimitExhaustedError(LLMProviderError):
    pass


class ProviderTimeoutError(LLMProviderError):
    pass


class MalformedOutputError(LLMProviderError):
    pass


def get_stage_cache_key(prompt_key: str, user_payload: str, model_name: str) -> str:
    """Compute a deterministic hash for caching completed diagnostic stages."""
    raw = f"{prompt_key}::{model_name}::{user_payload}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def read_cached_stage_result(cache_key: str) -> Optional[Dict[str, Any]]:
    """Retrieve cached stage output if caching is enabled."""
    if not settings.stage_cache_enabled:
        return None
    cache_file = settings.cache_dir / f"{cache_key}.json"
    if cache_file.exists():
        try:
            return json.loads(cache_file.read_text(encoding="utf-8"))
        except Exception:
            return None
    return None


def write_cached_stage_result(cache_key: str, data: Dict[str, Any]) -> None:
    """Store validated stage output to disk cache."""
    if not settings.stage_cache_enabled:
        return
    try:
        cache_file = settings.cache_dir / f"{cache_key}.json"
        cache_file.write_text(json.dumps(data, indent=2), encoding="utf-8")
    except Exception as exc:
        logger.debug(f"Failed to write stage cache: {exc}")


def repair_and_parse_json(raw_text: str) -> Dict[str, Any]:
    """
    Attempt controlled repair of malformed LLM JSON outputs:
    - Strip markdown code fences (```json ... ```)
    - Extract outer JSON object {...}
    - Fix trailing commas before closing braces/brackets
    """
    if not raw_text or not raw_text.strip():
        raise MalformedOutputError("Empty response from LLM.")

    cleaned = raw_text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned)

    start_idx = cleaned.find("{")
    end_idx = cleaned.rfind("}")
    if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
        cleaned = cleaned[start_idx : end_idx + 1]

    cleaned = re.sub(r",\s*([}\]])", r"\1", cleaned)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as err:
        raise MalformedOutputError(f"Failed to parse LLM JSON output: {err}")


def validate_structured_output(raw_text: str, schema_cls: Type[T]) -> T:
    """
    Validate raw LLM output against a Pydantic schema, attempting JSON repair
    and recursive nested list unpacking before raising a validation error.
    """
    try:
        return schema_cls.model_validate_json(raw_text)
    except Exception:
        repaired_dict = repair_and_parse_json(raw_text)
        try:
            return schema_cls.model_validate(repaired_dict)
        except Exception:
            for field_name in schema_cls.model_fields.keys():
                if field_name not in repaired_dict:
                    for v in repaired_dict.values():
                        if isinstance(v, dict) and field_name in v:
                            repaired_dict[field_name] = v[field_name]
                            break
                        elif isinstance(v, list) and len(v) > 0 and isinstance(v[0], dict):
                            repaired_dict[field_name] = v
                            break
            return schema_cls.model_validate(repaired_dict)


def _call_groq_chat_completion(
    system_prompt: str,
    user_payload: str,
    api_key: str,
    model: Optional[str] = None,
    timeout_sec: int = 25,
    max_retries: int = 3,
) -> str:
    """
    Call Groq's OpenAI-compatible Chat Completions endpoint using stdlib urllib.
    Implements exponential backoff on HTTP 429 and classifies provider errors.
    """
    if not api_key or not api_key.strip():
        raise MissingAPIKeyError("Groq API key is not configured.")

    sys_content = system_prompt
    if "json" not in sys_content.lower() and "json" not in user_payload.lower():
        sys_content = sys_content + "\nYou must format your entire response as a valid JSON object."

    url = "https://api.groq.com/openai/v1/chat/completions"
    body = {
        "model": model or settings.llm_model or "openai/gpt-oss-120b",
        "messages": [
            {"role": "system", "content": sys_content},
            {"role": "user", "content": user_payload},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.1,
        "max_tokens": 2048,
    }
    data_bytes = json.dumps(body).encode("utf-8")

    last_error: Optional[Exception] = None
    for attempt in range(max_retries):
        req = urllib.request.Request(
            url,
            data=data_bytes,
            headers={
                "Authorization": f"Bearer {api_key.strip()}",
                "Content-Type": "application/json",
                "User-Agent": "Stakeholder-Structure-Alignment-Analyzer/2.0",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
                resp_data = json.loads(resp.read().decode("utf-8"))
                return resp_data["choices"][0]["message"]["content"]
        except urllib.error.HTTPError as http_err:
            last_error = http_err
            status_code = http_err.code
            err_body = ""
            try:
                err_body = http_err.read().decode("utf-8", errors="ignore")
            except Exception:
                pass

            if status_code == 401 or status_code == 403:
                raise InvalidAPIKeyError(f"Invalid Groq API Key (HTTP {status_code}): {err_body}")
            elif status_code == 429:
                if attempt < max_retries - 1:
                    sleep_time = (2 ** attempt) + 0.5
                    logger.warning(f"Groq Rate limit (429) hit. Backing off for {sleep_time:.1f}s (attempt {attempt + 1}/{max_retries})")
                    time.sleep(sleep_time)
                    continue
                raise RateLimitExhaustedError(f"Groq free-tier rate limit exhausted (HTTP 429): {err_body}")
            elif status_code >= 500:
                if attempt < max_retries - 1:
                    time.sleep(1.5)
                    continue
                raise LLMProviderError(f"Groq provider server error (HTTP {status_code}): {err_body}")
            else:
                raise LLMProviderError(f"Groq API error (HTTP {status_code}): {err_body}")
        except urllib.error.URLError as url_err:
            last_error = url_err
            if "timed out" in str(url_err).lower():
                if attempt < max_retries - 1:
                    time.sleep(1.0)
                    continue
                raise ProviderTimeoutError(f"Groq API connection timed out after {timeout_sec}s: {url_err}")
            raise LLMProviderError(f"Groq API connection failure: {url_err}")
        except Exception as exc:
            last_error = exc
            if attempt < max_retries - 1:
                time.sleep(1.0)
                continue
            raise LLMProviderError(f"Unexpected error calling Groq: {exc}")

    raise LLMProviderError(f"Groq request failed after {max_retries} attempts: {last_error}")


def call_external_llm_json(
    prompt_key: str,
    user_payload: str,
    schema_cls: Optional[Type[T]] = None,
    use_cache: bool = True,
) -> Optional[Dict[str, Any]]:
    """
    Call an external LLM API (Groq, OpenAI, or Anthropic) with disk-caching & Pydantic schema validation.
    Returns None if operating in local 'evidence_engine' mode or if network/API is unreachable.
    """
    system_prompt = PROMPT_REGISTRY.get(prompt_key, "")
    provider = settings.llm_provider.lower()
    model_name = settings.llm_model or "openai/gpt-oss-120b"

    cache_key = get_stage_cache_key(prompt_key, user_payload, model_name)
    if use_cache:
        cached = read_cached_stage_result(cache_key)
        if cached is not None:
            logger.info(f"Loaded stage result from cache for prompt: {prompt_key}")
            return cached

    if (provider == "groq" or settings.groq_api_key) and settings.groq_api_key:
        try:
            content = _call_groq_chat_completion(
                system_prompt=system_prompt,
                user_payload=user_payload,
                api_key=settings.groq_api_key,
                model=model_name,
                timeout_sec=settings.llm_timeout_seconds,
                max_retries=settings.llm_retry_attempts,
            )
            result_dict: Dict[str, Any]
            if schema_cls:
                validated = validate_structured_output(content, schema_cls)
                result_dict = validated.model_dump()
            else:
                result_dict = repair_and_parse_json(content)

            write_cached_stage_result(cache_key, result_dict)
            return result_dict
        except Exception as exc:
            logger.warning(f"Groq API stage execution failed for '{prompt_key}': {exc}")
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
                result_dict = validated.model_dump()
            else:
                result_dict = repair_and_parse_json(content)
            write_cached_stage_result(cache_key, result_dict)
            return result_dict
        except Exception as exc:
            logger.warning(f"OpenAI stage execution failed: {exc}")
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
                result_dict = validated.model_dump()
            else:
                result_dict = repair_and_parse_json(content)
            write_cached_stage_result(cache_key, result_dict)
            return result_dict
        except Exception as exc:
            logger.warning(f"Anthropic stage execution failed: {exc}")
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
