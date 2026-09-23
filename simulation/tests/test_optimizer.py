import pytest

from simulation import find_best_scenarios, simulate_scenario, validate_scenario


@pytest.fixture(scope="module")
def optimized_results():
    return find_best_scenarios(top_n=10)


def test_optimizer_returns_only_valid_scenarios(optimized_results):
    results = optimized_results
    assert results
    for result in results:
        assert validate_scenario(result["selected_measures"])["valid"]
        assert result["total_cost"] <= 100
        assert "score" in result
        assert "weakest_district" in result
        assert "critical_count" in result


def test_optimizer_scenarios_are_sorted_descending_by_score(optimized_results):
    results = optimized_results
    scores = [result["score"] for result in results]
    assert scores == sorted(scores, reverse=True)


def test_optimizer_score_matches_simulator(optimized_results):
    best = optimized_results[0]
    independently_calculated = simulate_scenario(best["selected_measures"])
    assert best["score"] == independently_calculated["score"]
