"""Shared OpenAI structured-text helper; no simulation logic lives here."""
from __future__ import annotations

import json
import os
from typing import Any, TypeVar

from pydantic import BaseModel


class AIConfigurationError(RuntimeError):
    """Required AI configuration is missing."""


class AIServiceError(RuntimeError):
    """The AI provider failed or returned an invalid response."""


T = TypeVar("T", bound=BaseModel)


def ask_agent(prompt: str, facts: dict[str, Any], schema: type[T]) -> T:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise AIConfigurationError(
            "AI не настроен: задайте OPENAI_API_KEY в локальном .env и перезапустите backend."
        )
    try:
        from openai import OpenAI

        client = OpenAI(
            api_key=api_key,
            timeout=float(os.getenv("OPENAI_TIMEOUT_SECONDS", "15")),
            max_retries=0,
        )
        response = client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
            messages=[
                {"role": "system", "content": prompt},
                {
                    "role": "user",
                    "content": json.dumps(facts, ensure_ascii=False, separators=(",", ":")),
                },
            ],
            response_format={\n                "type": "json_schema",\n                "json_schema": {\n                    "name": schema.__name__.lower(),\n                    "strict": True,\n                    "schema": schema.model_json_schema(),\n                },\n            },
        )
        content = response.choices[0].message.content
        if not content:
            raise ValueError("empty response")
        return schema.model_validate_json(content)
    except (AIConfigurationError, AIServiceError):
        raise
    except Exception as error:
        raise AIServiceError("AI-анализ временно недоступен; повторите запрос позже.") from error
