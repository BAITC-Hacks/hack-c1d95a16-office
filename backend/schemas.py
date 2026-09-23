"""Shared API input and output schemas."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class APIModel(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class MetricOut(APIModel):
    label: str
    value: float
    unit: str


class DistrictOut(APIModel):
    id: str
    name: str
    description: str
    population: float | None = None
    metrics: list[MetricOut]


class ActionOut(APIModel):
    id: str
    category: Literal["transport", "green", "social", "safety", "services"]
    title: str
    description: str
    cost: float
    district_ids: list[str] | None = Field(default=None, alias="districtIds")


class BootstrapOut(APIModel):
    dataset_version: str = Field(alias="datasetVersion")
    city_name: str = Field(alias="cityName")
    budget: float
    budget_unit: str = Field(alias="budgetUnit")
    districts: list[DistrictOut]
    actions: list[ActionOut]


class PlanIn(APIModel):
    """Frontend selection; prices and scores are never accepted from the client."""
    dataset_version: str = Field(alias="datasetVersion")
    district_id: str = Field(alias="districtId")
    action_ids: list[str] = Field(alias="actionIds")


class OptimizePlanIn(PlanIn):
    top_n: int = Field(default=5, ge=1, le=10, alias="topN")


class MetricChange(APIModel):
    label: str
    before: float
    after: float
    unit: str


class SimulationOut(APIModel):
    scenario_id: str = Field(alias="scenarioId")
    dataset_version: str = Field(alias="datasetVersion")
    spent: float
    remaining: float
    baseline_score: float = Field(alias="baselineScore")
    projected_score: float = Field(alias="projectedScore")
    metrics: list[MetricChange]
    assumptions: list[str]
