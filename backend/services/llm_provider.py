"""
Configurable LLM Provider Abstraction with Structured JSON Validation and Auto-Repair.
Supports OpenAI, Anthropic, Gemini, and the local Evidence-Grounded Diagnostic Engine.
"""

import json
import re
from typing import Any, Dict, Optional, Type, TypeVar
from pydantic import BaseModel, ValidationError

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

    # Remove trailing commas before } or ]
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


def call_external_llm_json(
    prompt_key: str,
    user_payload: str,
    schema_cls: Optional[Type[T]] = None,
) -> Optional[Dict[str, Any]]:
    """
    Call an external LLM API (OpenAI or Anthropic) if configured with an API key.
    Returns None if operating in local 'evidence_engine' mode or if no API key is set.
    """
    system_prompt = PROMPT_REGISTRY.get(prompt_key, "")
    provider = settings.llm_provider.lower()

    if provider == "openai" and settings.openai_api_key:
        try:
            from openai import OpenAI

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
            import anthropic

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

