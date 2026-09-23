"""HTTP routes delegating all city data and calculations to simulation."""
from __future__ import annotations

from importlib import import_module
from types import ModuleType
from typing import Any

from fastapi import APIRouter, HTTPException

from backend.schemas import ScenarioRequest

router = APIRouter()


def _simulation_engine() -> ModuleType:
    """Load the team's simulation package when its branch is integrated."""
    try:
        return import_module("simulation")
    except ModuleNotFoundError as error:
        if error.name == "simulation" or (
            error.name is not None and error.name.startswith("simulation.")
        ):
            raise HTTPException(
                status_code=503,
                detail=(
                    "Simulation engine is unavailable. Integrate "
                    "feature/simulation with the backend branch first."
                ),
            ) from error
        raise


@router.get("/health")
def health() -> dict[str, Any]:
    """Report API and simulation-engine availability."""
    try:
        _simulation_engine()
    except HTTPException:
        return {"status": "degraded", "simulation_engine": "unavailable"}
    return {"status": "ok", "simulation_engine": "available"}


@router.get("/districts")
def districts() -> list[dict[str, Any]]:
    """Return canonical district data from the simulation engine."""
    engine = _simulation_engine()
    return engine.get_districts()


@router.get("/measures")
def measures() -> list[dict[str, Any]]:
    """Return the engine's canonical intervention catalog."""
    engine = _simulation_engine()
    return engine.get_measures()


@router.post("/simulate")
def simulate(request: ScenarioRequest) -> dict[str, Any]:
    """Validate and simulate; the engine returns no Score for invalid input."""
    engine = _simulation_engine()
    scenario = request.model_dump()
    return engine.simulate_scenario(scenario)
