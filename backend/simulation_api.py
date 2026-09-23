"""JSON transport for the public deterministic simulation API.

This adapter validates JSON types only. Scenario rules and every numerical
result belong to simulation, including validation and comparison failures.
"""

from importlib import import_module
from types import ModuleType
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field

router = APIRouter()


def _engine() -> ModuleType:
    """Keep health/startup available when the separate engine is not installed."""
    try:
        return import_module("simulation")
    except ModuleNotFoundError as error:
        if error.name == "simulation" or (error.name and error.name.startswith("simulation.")):
            raise HTTPException(status_code=503, detail="Simulation engine is unavailable.") from error
        raise


class TransportModel(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class DecisionRequest(TransportModel):
    measure_id: str = Field(alias="measureId", strict=True)
    district: str | None = Field(default=None, strict=True)


class ScenarioRequest(TransportModel):
    decisions: list[DecisionRequest]

    def engine_input(self) -> dict[str, Any]:
        """Convert Pydantic models to the dictionaries accepted by the engine."""
        return {"decisions": [item.model_dump(by_alias=False) for item in self.decisions]}


class OptimizeRequest(TransportModel):
    top_n: int = Field(default=5, ge=1, le=10, strict=True, alias="topN")


class CompareRequest(TransportModel):
    scenario_a: ScenarioRequest = Field(alias="scenarioA")
    scenario_b: ScenarioRequest = Field(alias="scenarioB")


def _validated_result(result: dict[str, Any]) -> dict[str, Any]:
    if not result["valid"]:
        # Preserve the complete structured engine error (and no score).
        raise HTTPException(status_code=422, detail=result)
    return result


def simulate_decisions(request: ScenarioRequest) -> dict[str, Any]:
    """Return the full engine result for explicit per-measure assignments."""
    return _validated_result(_engine().simulate_scenario(request.engine_input()))


@router.get("/baseline")
def baseline() -> dict[str, Any]:
    return _engine().calculate_baseline()


@router.post("/optimize")
def optimize(request: OptimizeRequest) -> dict[str, Any]:
    """Expose the deterministic search without requiring an AI configuration."""
    return {"scenarios": _engine().find_best_scenarios(top_n=request.top_n)}


@router.post("/compare")
def compare(request: CompareRequest) -> dict[str, Any]:
    """Return the engine's B-minus-A differences without recomputing them."""
    return _validated_result(_engine().compare_scenarios(
        request.scenario_a.engine_input(), request.scenario_b.engine_input(),
    ))
