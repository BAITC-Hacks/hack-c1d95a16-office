"""Optimizer adapter: delegates candidate search and comparisons to simulation."""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict

from agents.common import ask_agent
from agents.prompts import OPTIMIZER_PROMPT


class OptimizerExplanation(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reasoning: str


class OptimizerAgent:
    def optimize(
        self,
        engine: Any,
        current_decisions: list[dict[str, Any]],
        current_result: dict[str, Any],
        top_n: int,
    ) -> tuple[dict[str, Any], list[dict[str, Any]]]:
        candidates = engine.find_best_scenarios(top_n=top_n)
        if not candidates:
            raise ValueError("Simulation engine returned no optimized scenarios.")
        recommended = candidates[0]
        recommended_decisions = recommended["selected_measures"]
        comparison = engine.compare_scenarios(
            {"decisions": current_decisions},
            {"decisions": recommended_decisions},
        )
        if not comparison.get("valid"):
            raise ValueError("Simulation engine could not compare the scenarios.")
        facts = {
            "current": current_result,
            "recommended": recommended,
            "comparison": comparison,
            "other_engine_candidates": candidates[1:],
        }
        explanation = ask_agent(OPTIMIZER_PROMPT, facts, OptimizerExplanation)
        output = {
            "current_score": current_result["score"],
            "recommended_score": recommended["score"],
            "improvement": comparison["score_delta"],
            "recommended_scenario": recommended_decisions,
            "reasoning": explanation.reasoning,
        }
        return output, candidates
