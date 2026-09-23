"""Risk critic: interprets only values produced by the simulation engine."""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict

from agents.common import ask_agent
from agents.prompts import RISK_PROMPT


class RiskAnalysis(BaseModel):
    model_config = ConfigDict(extra="forbid")
    risk_level: Literal["low", "medium", "high"]
    risks: list[str]
    critical_findings: list[str]
    warnings: list[str]


class RiskAgent:
    def analyze(self, facts: dict[str, Any]) -> dict[str, Any]:
        return ask_agent(RISK_PROMPT, facts, RiskAnalysis).model_dump()
