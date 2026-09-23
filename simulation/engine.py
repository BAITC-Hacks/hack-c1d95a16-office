"""Deterministic intervention effects and city-score calculation."""

from collections import defaultdict
from collections.abc import Mapping
from typing import Any

from .data import (
    BUDGET,
    DISTRICTS,
    DISTRICT_BY_NAME,
    HORIZON_QUARTERS,
    INDICATOR_WEIGHTS,
    MEASURE_BY_ID,
)
from .models import Decision
from .validator import normalize_decisions, validate_scenario

_INDICATORS = tuple(INDICATOR_WEIGHTS)
_INDICATOR_INDEX = {indicator: index for index, indicator in enumerate(_INDICATORS)}
_WEIGHTS = tuple(INDICATOR_WEIGHTS[indicator] for indicator in _INDICATORS)
_DISTRICT_INDEX = {district.name: index for index, district in enumerate(DISTRICTS)}
_BASELINE_VALUES = tuple(tuple(district.indicators[key] for key in _INDICATORS) for district in DISTRICTS)


def _score_indicators(indicators: Mapping[str, float]) -> float:
    return sum(INDICATOR_WEIGHTS[key] * indicators[key] for key in INDICATOR_WEIGHTS)


def _calculate(decisions: list[Decision], total_cost: int, *, include_details: bool = True) -> dict[str, Any]:
    """Calculate metrics using arrays; optionally materialize explanatory details."""
    final_values = [list(values) for values in _BASELINE_VALUES]
    contributions: list[dict[str, Any]] = []
    selected = {decision.measure_id.upper(): decision for decision in decisions}
    district_indices = tuple(range(len(DISTRICTS)))

    for decision in decisions:
        measure = MEASURE_BY_ID[decision.measure_id.upper()]
        targets = (_DISTRICT_INDEX[decision.district.upper()],) if measure.scope == "DISTRICT" else district_indices
        scale = (HORIZON_QUARTERS - measure.lag) / HORIZON_QUARTERS
        realized = {key: amount * scale for key, amount in measure.effects.items()}
        for district_index in targets:
            for indicator, amount in realized.items():
                final_values[district_index][_INDICATOR_INDEX[indicator]] += amount
        if include_details:
            contributions.append({
                "measure_id": measure.id,
                "name": measure.name,
                "scope": measure.scope,
                "district": decision.district.upper() if decision.district else None,
                "cost": measure.cost,
                "lag": measure.lag,
                "realized_effects": realized,
                "applied_to": [DISTRICTS[index].name for index in targets],
            })

    synergy_specs = (
        ("M1", "M2", {"T1": 2}, "Bus lanes and adaptive signals"),
        ("M10", "M12", {"B1": 2}, "Safe City and citizen request platform"),
        ("M5", "M6", {"E2": 2}, "Cleaner fuel and city greenery"),
    )
    synergies: list[dict[str, Any]] = []
    for first, second, bonus, label in synergy_specs:
        if first in selected and second in selected:
            district_name = selected[first].district.upper()
            district = _DISTRICT_INDEX[district_name]
            for indicator, amount in bonus.items():
                final_values[district][_INDICATOR_INDEX[indicator]] += amount
            if include_details:
                synergies.append({"measures": [first, second], "district": district_name, "effects": bonus, "description": label})

    clipped = [[min(100.0, max(0.0, value)) for value in row] for row in final_values]
    initial_scores: list[float] = []
    final_scores: list[float] = []
    critical_count = 0
    weighted_average = 0.0
    initial_weighted_average = 0.0
    for index, district in enumerate(DISTRICTS):
        initial_score = sum(_WEIGHTS[k] * _BASELINE_VALUES[index][k] for k in range(len(_WEIGHTS)))
        final_score = sum(_WEIGHTS[k] * clipped[index][k] for k in range(len(_WEIGHTS)))
        initial_scores.append(initial_score)
        final_scores.append(final_score)
        critical_count += sum(value < 40 for value in clipped[index])
        weighted_average += district.population_share * final_score
        initial_weighted_average += district.population_share * initial_score
    weakest_index = min(range(len(DISTRICTS)), key=final_scores.__getitem__)
    weakest = DISTRICTS[weakest_index].name
    baseline_weakest = min(initial_scores)
    baseline_critical = sum(value < 40 for row in _BASELINE_VALUES for value in row)
    baseline_score = 0.7 * initial_weighted_average + 0.3 * baseline_weakest - baseline_critical
    score = 0.7 * weighted_average + 0.3 * final_scores[weakest_index] - critical_count
    if not include_details:
        return {
            "total_cost": total_cost,
            "score": score,
            "city_average": weighted_average,
            "weakest_district": weakest,
            "critical_count": critical_count,
        }

    districts: dict[str, dict[str, Any]] = {}
    for index, district in enumerate(DISTRICTS):
        initial = dict(zip(_INDICATORS, _BASELINE_VALUES[index]))
        final = dict(zip(_INDICATORS, clipped[index]))
        districts[district.name] = {
            "initial_score": initial_scores[index],
            "final_score": final_scores[index],
            "delta": final_scores[index] - initial_scores[index],
            "initial_indicators": initial,
            "final_indicators": final,
            "indicator_deltas": {key: final[key] - initial[key] for key in _INDICATORS},
        }
    return {
        "valid": True,
        "total_cost": total_cost,
        "remaining_budget": BUDGET - total_cost,
        "score": score,
        "baseline_score": baseline_score,
        "score_delta": score - baseline_score,
        "city_average": weighted_average,
        "weakest_district": weakest,
        "critical_count": critical_count,
        "districts": districts,
        "measure_contributions": contributions,
        "synergies_triggered": synergies,
        "decisions": [decision.to_dict() for decision in decisions],
    }


def simulate_scenario(scenario: Any) -> dict[str, Any]:
    """Validate and simulate a scenario; invalid scenarios receive no score."""
    decisions = normalize_decisions(scenario)
    validation = validate_scenario(decisions)
    if not validation["valid"]:
        return {"valid": False, "errors": validation["errors"], "total_cost": validation["total_cost"]}
    # Resolve IDs canonically and districts uniformly for downstream callers.
    canonical = [Decision(d.measure_id.upper(), d.district.upper() if d.district else None) for d in decisions]
    return _calculate(canonical, validation["total_cost"])


def calculate_baseline() -> dict[str, Any]:
    """Return scores and indicators for the city with no selected measures."""
    return _calculate([], 0)


def compare_scenarios(scenario_a: Any, scenario_b: Any) -> dict[str, Any]:
    """Compare two scenarios with deterministic numerical deltas (B minus A)."""
    result_a = simulate_scenario(scenario_a)
    result_b = simulate_scenario(scenario_b)
    if not result_a["valid"] or not result_b["valid"]:
        return {
            "valid": False,
            "errors": {"scenario_a": result_a.get("errors", []), "scenario_b": result_b.get("errors", [])},
        }
    return {
        "valid": True,
        "score_delta": result_b["score"] - result_a["score"],
        "city_average_delta": result_b["city_average"] - result_a["city_average"],
        "critical_count_delta": result_b["critical_count"] - result_a["critical_count"],
        "total_cost_delta": result_b["total_cost"] - result_a["total_cost"],
        "district_score_deltas": {
            name: result_b["districts"][name]["final_score"] - result_a["districts"][name]["final_score"]
            for name in DISTRICT_BY_NAME
        },
        "indicator_deltas": {
            name: {
                indicator: result_b["districts"][name]["final_indicators"][indicator]
                - result_a["districts"][name]["final_indicators"][indicator]
                for indicator in INDICATOR_WEIGHTS
            }
            for name in DISTRICT_BY_NAME
        },
        "weakest_district_a": result_a["weakest_district"],
        "weakest_district_b": result_b["weakest_district"],
    }
