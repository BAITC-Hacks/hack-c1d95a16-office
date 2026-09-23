"""Coordinates narrative agents around deterministic simulation results."""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from typing import Any

from agents.common import AIConfigurationError, AIServiceError
from agents.executive_agent import ExecutiveAgent
from agents.optimizer_agent import OptimizerAgent
from agents.policy_agent import PolicyAgent
from agents.risk_agent import RiskAgent


class AIOrchestrator:
    def __init__(self) -> None:
        self.policy = PolicyAgent()
        self.risk = RiskAgent()
        self.optimizer = OptimizerAgent()
        self.executive = ExecutiveAgent()

    def analyze(
        self,
        engine: Any,
        decisions: list[dict[str, Any]],
        simulation_result: dict[str, Any],
        top_n: int = 5,
    ) -> dict[str, Any]:
        # Every supplied number is taken from the engine's result/catalog.
        selected_ids = {item["measure_id"].upper() for item in decisions}
        selected_measures = [
            measure for measure in engine.get_measures()
            if str(measure["id"]).upper() in selected_ids
        ]
        facts = {
            "selected_decisions": decisions,
            "selected_measures_from_engine": selected_measures,
            "simulation_result": simulation_result,
        }
        with ThreadPoolExecutor(max_workers=2) as pool:
            policy_future = pool.submit(self.policy.analyze, facts)
            risk_future = pool.submit(self.risk.analyze, facts)
            policy = policy_future.result()
            risk = risk_future.result()
        optimizer_facts, scenarios = self.optimizer.optimize(
            engine, decisions, simulation_result, top_n
        )
        executive = self.executive.recommend({
            "policy": policy,
            "risk": risk,
            "optimizer": optimizer_facts,
        })
        return {
            "policy": policy,
            "risk": risk,
            "optimizer": optimizer_facts,
            "executive": executive,
            "optimized_scenarios": scenarios,
        }


__all__ = ["AIConfigurationError", "AIServiceError", "AIOrchestrator"]
