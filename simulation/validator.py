"""Validation for submitted city-intervention scenarios."""

from collections import Counter
from collections.abc import Iterable
from typing import Any

from .data import BUDGET, DISTRICT_BY_NAME, MEASURE_BY_ID, REQUIRED_DECISIONS
from .models import Decision


def normalize_decisions(scenario: Any) -> list[Decision]:
    """Normalize a sequence of decision dictionaries, tuples, or Decision objects."""
    if isinstance(scenario, dict):
        scenario = scenario.get("decisions", [])
    if not isinstance(scenario, Iterable) or isinstance(scenario, (str, bytes)):
        return []
    return [Decision.from_value(item) for item in scenario]


def validate_scenario(scenario: Any) -> dict[str, Any]:
    """Return every detectable validation error without calculating a score."""
    decisions = normalize_decisions(scenario)
    errors: list[str] = []
    if len(decisions) != REQUIRED_DECISIONS:
        errors.append(f"Scenario must contain exactly {REQUIRED_DECISIONS} decisions; got {len(decisions)}.")

    ids = [decision.measure_id.upper() for decision in decisions]
    known = [MEASURE_BY_ID.get(measure_id) for measure_id in ids]
    total_cost = sum(measure.cost for measure in known if measure is not None)
    for index, (decision, measure_id, measure) in enumerate(zip(decisions, ids, known), start=1):
        if measure is None:
            errors.append(f"Decision {index}: unknown measure '{decision.measure_id}'.")
            continue
        district = decision.district.upper() if decision.district is not None else None
        if measure.scope == "DISTRICT":
            if district is None:
                errors.append(f"Decision {index} ({measure_id}): district measure requires exactly one district.")
            elif district not in DISTRICT_BY_NAME:
                errors.append(f"Decision {index} ({measure_id}): unknown district '{decision.district}'.")
        elif district is not None:
            errors.append(f"Decision {index} ({measure_id}): city measure must not specify a district.")

    duplicates = sorted(measure_id for measure_id, count in Counter(ids).items() if count > 1)
    if duplicates:
        errors.append("Measures can be selected only once; duplicated: " + ", ".join(duplicates) + ".")
    if total_cost > BUDGET:
        errors.append(f"Total cost {total_cost} exceeds budget {BUDGET}.")

    known_measures = [measure for measure in known if measure is not None]
    categories = Counter(measure.category for measure in known_measures)
    for category, count in sorted(categories.items()):
        if count > 2:
            errors.append(f"Category {category} has {count} measures; at most 2 are allowed.")

    selected = set(ids)
    if "M1" in selected and "M3" in selected:
        errors.append("M1 and M3 are incompatible and cannot both be selected.")
    for first, second in (("M4", "M7"), ("M5", "M13")):
        if first in selected and second in selected:
            first_district = next((d.district.upper() for d, mid in zip(decisions, ids) if mid == first and d.district), None)
            second_district = next((d.district.upper() for d, mid in zip(decisions, ids) if mid == second and d.district), None)
            if first_district is not None and first_district == second_district:
                errors.append(f"{first} and {second} cannot be applied to the same district ({first_district}).")

    return {"valid": not errors, "errors": errors, "total_cost": total_cost}

