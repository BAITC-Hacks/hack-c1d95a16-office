"""Deterministic HackAlem AI city-management simulation engine."""

from .data import DISTRICTS, MEASURES
from .engine import calculate_baseline, compare_scenarios, simulate_scenario
from .optimizer import find_best_scenarios
from .validator import validate_scenario


def get_districts() -> list[dict[str, object]]:
    """Return the canonical districts and their initial indicator values."""
    return [
        {"name": district.name, "population_share": district.population_share, "indicators": dict(district.indicators)}
        for district in DISTRICTS
    ]


def get_measures() -> list[dict[str, object]]:
    """Return the canonical intervention catalog."""
    return [
        {
            "id": measure.id,
            "category": measure.category,
            "name": measure.name,
            "scope": measure.scope,
            "cost": measure.cost,
            "lag": measure.lag,
            "effects": dict(measure.effects),
        }
        for measure in MEASURES
    ]


__all__ = [
    "simulate_scenario",
    "validate_scenario",
    "find_best_scenarios",
    "compare_scenarios",
    "get_districts",
    "get_measures",
    "calculate_baseline",
]

