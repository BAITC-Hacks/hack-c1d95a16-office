"""Policy analyst: interprets engine-produced district and measure effects."""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict

from agents.common import ask_agent
from agents.prompts import POLICY_PROMPT


class PolicyAnalysis(BaseModel):
    model_config = ConfigDict(extra="forbid")
    summary: str
    strengths: list[str]
    tradeoffs: list[str]
    district_observations: list[str]


class PolicyAgent:
    def analyze(self, facts: dict[str, Any]) -> dict[str, Any]:
        return ask_agent(POLICY_PROMPT, facts, PolicyAnalysis).model_dump()
