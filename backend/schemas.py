"""HTTP request schemas.

The engine remains the source of truth for scenario rules and all calculations.
"""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class DecisionInput(BaseModel):
    """One engine decision; district is omitted for city-wide measures."""

    model_config = ConfigDict(extra="forbid")

    measure_id: str
    district: str | None = None


class ScenarioRequest(BaseModel):
    """Engine-native scenario input."""

    model_config = ConfigDict(extra="forbid")

    decisions: list[DecisionInput]
