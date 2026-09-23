"""Canonical city indicators, weights, and intervention definitions."""

from dataclasses import dataclass
from typing import Mapping


INDICATOR_WEIGHTS: dict[str, float] = {
    "T1": 0.10,
    "T2": 0.10,
    "E1": 0.09,
    "E2": 0.11,
    "S1": 0.11,
    "S2": 0.11,
    "B1": 0.09,
    "B2": 0.09,
    "C1": 0.10,
    "C2": 0.10,
}


@dataclass(frozen=True)
class District:
    name: str
    population_share: float
    indicators: Mapping[str, float]


@dataclass(frozen=True)
class Measure:
    id: str
    category: str
    name: str
    scope: str
    cost: int
    lag: int
    effects: Mapping[str, float]


DISTRICTS: tuple[District, ...] = (
    District("ESIL", 0.27, {"T1": 45, "T2": 62, "E1": 68, "E2": 72, "S1": 48, "S2": 55, "B1": 78, "B2": 60, "C1": 75, "C2": 70}),
    District("ALMATY", 0.24, {"T1": 40, "T2": 75, "E1": 50, "E2": 55, "S1": 60, "S2": 65, "B1": 62, "B2": 52, "C1": 50, "C2": 60}),
    District("SARYARKA", 0.20, {"T1": 50, "T2": 70, "E1": 42, "E2": 40, "S1": 62, "S2": 68, "B1": 58, "B2": 55, "C1": 45, "C2": 55}),
    District("BAIKONUR", 0.13, {"T1": 52, "T2": 68, "E1": 55, "E2": 50, "S1": 58, "S2": 60, "B1": 52, "B2": 58, "C1": 55, "C2": 58}),
    District("NURA", 0.16, {"T1": 55, "T2": 40, "E1": 45, "E2": 65, "S1": 38, "S2": 35, "B1": 55, "B2": 50, "C1": 60, "C2": 50}),
)


MEASURES: tuple[Measure, ...] = (
    Measure("M1", "TRANSPORT", "Dedicated bus lanes", "DISTRICT", 18, 2, {"T1": 6, "T2": 9}),
    Measure("M2", "TRANSPORT", "Smart adaptive traffic lights", "CITY", 22, 2, {"T1": 4, "B2": 3}),
    Measure("M3", "TRANSPORT", "LRT line / expansion", "DISTRICT", 30, 4, {"T1": 16, "T2": 20, "E2": 4}),
    Measure("M4", "ECOLOGY", "Park / public square", "DISTRICT", 15, 2, {"E1": 12, "E2": 3, "B1": 2}),
    Measure("M5", "ECOLOGY", "Convert private sector to cleaner fuel", "DISTRICT", 25, 3, {"E2": 14, "C1": 4}),
    Measure("M6", "ECOLOGY", "City greenery and windbreak program", "CITY", 20, 4, {"E1": 5, "E2": 3}),
    Measure("M7", "SOCIAL", "Modular school + kindergarten", "DISTRICT", 24, 3, {"S1": 16}),
    Measure("M8", "SOCIAL", "Family health center / clinic", "DISTRICT", 20, 3, {"S2": 14}),
    Measure("M9", "SOCIAL", "Community sports hubs", "DISTRICT", 10, 1, {"S1": 3, "S2": 3, "B1": 3}),
    Measure("M10", "SAFETY", "Lighting and cameras / Safe City", "DISTRICT", 12, 1, {"B1": 12, "B2": 2}),
    Measure("M11", "SAFETY", "Safe pedestrian crossings and school zones", "DISTRICT", 10, 1, {"B2": 12, "T1": -2}),
    Measure("M12", "SERVICES", "Unified digital citizen request platform", "CITY", 14, 1, {"C2": 5}),
    Measure("M13", "SERVICES", "Heating and water network modernization", "DISTRICT", 28, 4, {"C1": 18, "E2": 2}),
    Measure("M14", "SERVICES", "Emergency utility teams + early warning", "CITY", 16, 1, {"C1": 5, "C2": 2}),
)

DISTRICT_BY_NAME = {district.name: district for district in DISTRICTS}
MEASURE_BY_ID = {measure.id: measure for measure in MEASURES}
DISTRICT_NAMES = tuple(district.name for district in DISTRICTS)
HORIZON_QUARTERS = 8
BUDGET = 100
REQUIRED_DECISIONS = 5

