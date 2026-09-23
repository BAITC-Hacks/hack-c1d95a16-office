"""Executive advisor: combines policy, risk, and optimizer narratives."""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from agents.common import ask_agent
from agents.prompts import EXECUTIVE_PROMPT


class ExecutiveRecommendation(BaseModel):
    model_config = ConfigDict(extra="forbid")
    executive_summary: str
    top_strengths: list[str] = Field(default_factory=list)
    main_risks: list[str] = Field(default_factory=list)
    recommended_actions: list[str] = Field(default_factory=list)
    final_comment: str


class ExecutiveAgent:
    def recommend(self, facts: dict[str, Any]) -> dict[str, Any]:
        return ask_agent(EXECUTIVE_PROMPT, facts, ExecutiveRecommendation).model_dump()
