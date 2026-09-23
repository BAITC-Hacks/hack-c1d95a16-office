"""Exhaustive deterministic search over all valid five-decision scenarios."""

from collections import Counter
import heapq
from itertools import combinations, product
from itertools import count
from typing import Any

from .data import BUDGET, DISTRICT_NAMES, MEASURES, REQUIRED_DECISIONS
from .engine import _calculate
from .models import Decision


def find_best_scenarios(top_n: int = 10) -> list[dict[str, Any]]:
    """Enumerate every valid scenario and return the highest scoring ``top_n``."""
    if top_n <= 0:
        return []
    best: list[tuple[float, int, int, tuple[tuple[str, str], ...], dict[str, Any]]] = []
    sequence = count()
    for chosen in combinations(MEASURES, REQUIRED_DECISIONS):
        if sum(measure.cost for measure in chosen) > BUDGET:
            continue
        category_counts = Counter(measure.category for measure in chosen)
        if any(count > 2 for count in category_counts.values()):
            continue
        ids = {measure.id for measure in chosen}
        if "M1" in ids and "M3" in ids:
            continue

        district_measures = [measure for measure in chosen if measure.scope == "DISTRICT"]
        for assignments in product(DISTRICT_NAMES, repeat=len(district_measures)):
            assignment = dict(zip((measure.id for measure in district_measures), assignments))
            if "M4" in assignment and "M7" in assignment and assignment["M4"] == assignment["M7"]:
                continue
            if "M5" in assignment and "M13" in assignment and assignment["M5"] == assignment["M13"]:
                continue
            decisions = [Decision(measure.id, assignment.get(measure.id)) for measure in chosen]
            total_cost = sum(measure.cost for measure in chosen)
            result = _calculate(decisions, total_cost, include_details=False)
            result["selected_measures"] = [decision.to_dict() for decision in decisions]
            signature = tuple((decision.measure_id, decision.district or "") for decision in decisions)
            # Heap keeps only top_n candidates, avoiding repeated full sorting
            # across the exhaustive search space.
            heapq.heappush(best, (result["score"], -result["total_cost"], next(sequence), signature, result))
            if len(best) > top_n:
                heapq.heappop(best)

    ordered = [entry[4] for entry in sorted(best, key=lambda entry: (-entry[0], -entry[1], entry[3]))]
    for item in ordered:
        # Compact optimizer response while retaining all fields needed by clients.
        item.pop("districts", None)
        item.pop("measure_contributions", None)
        item.pop("synergies_triggered", None)
        item.pop("baseline_score", None)
        item.pop("score_delta", None)
        item.pop("city_average", None)
        item.pop("remaining_budget", None)
        item.pop("valid", None)
        item.pop("errors", None)
    return ordered
