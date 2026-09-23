import pytest

from simulation import calculate_baseline, compare_scenarios, simulate_scenario
from simulation import engine
from simulation.data import District
from simulation.models import Decision


def official_example():
    return [("M7", "NURA"), ("M8", "NURA"), ("M10", "NURA"), ("M12", None), ("M5", "SARYARKA")]


def test_baseline_matches_official_case():
    result = calculate_baseline()
    assert result["city_average"] == pytest.approx(56.86, abs=0.01)
    assert result["weakest_district"] == "NURA"
    assert result["districts"]["NURA"]["final_score"] == pytest.approx(49.18, abs=0.01)
    assert result["critical_count"] == 2
    assert result["score"] == pytest.approx(52.56, abs=0.01)
    assert result["districts"]["NURA"]["final_indicators"]["S1"] == 38
    assert result["districts"]["NURA"]["final_indicators"]["S2"] == 35


def test_official_example_is_calculated_from_rules():
    result = simulate_scenario(official_example())
    assert result["valid"]
    assert result["total_cost"] == 95
    assert result["score"] == pytest.approx(56.5, abs=0.2)


def test_invalid_scenario_does_not_return_score():
    result = simulate_scenario(official_example()[:-1])
    assert not result["valid"]
    assert "score" not in result


def test_synergy_m1_m2_applies_fixed_bonus_to_m1_district():
    scenario = [("M1", "NURA"), ("M2", None), ("M7", "ESIL"), ("M8", "SARYARKA"), ("M10", "BAIKONUR")]
    result = simulate_scenario(scenario)
    assert result["districts"]["NURA"]["indicator_deltas"]["T1"] == pytest.approx(4.5 + 3 + 2)
    assert result["synergies_triggered"][0]["measures"] == ["M1", "M2"]


def test_synergy_m10_m12_applies_fixed_bonus_to_m10_district():
    scenario = [("M10", "BAIKONUR"), ("M12", None), ("M1", "ESIL"), ("M8", "NURA"), ("M4", "ALMATY")]
    result = simulate_scenario(scenario)
    assert result["districts"]["BAIKONUR"]["indicator_deltas"]["B1"] == pytest.approx(10.5 + 2)
    assert any(item["measures"] == ["M10", "M12"] for item in result["synergies_triggered"])


def test_synergy_m5_m6_applies_fixed_bonus_to_m5_district():
    scenario = [("M5", "SARYARKA"), ("M6", None), ("M7", "NURA"), ("M10", "ESIL"), ("M12", None)]
    result = simulate_scenario(scenario)
    assert result["districts"]["SARYARKA"]["indicator_deltas"]["E2"] == pytest.approx(8.75 + 1.5 + 2)
    assert any(item["measures"] == ["M5", "M6"] for item in result["synergies_triggered"])


def test_lag_scaling_is_applied_to_full_measure_effect():
    result = simulate_scenario([("M7", "NURA"), ("M8", "ESIL"), ("M10", "ALMATY"), ("M12", None), ("M5", "SARYARKA")])
    assert result["districts"]["NURA"]["indicator_deltas"]["S1"] == pytest.approx(16 * 5 / 8)


def test_indicator_values_are_clipped_to_zero_and_100(monkeypatch):
    indicators = {key: 50.0 for key in engine.INDICATOR_WEIGHTS}
    indicators.update({"T1": 0.0, "T2": 99.0})
    monkeypatch.setattr(engine, "DISTRICTS", (District("ESIL", 1.0, indicators),))
    monkeypatch.setattr(engine, "_BASELINE_VALUES", (tuple(indicators[key] for key in engine._INDICATORS),))
    lower = engine._calculate([Decision("M11", "ESIL")], 10)
    upper = engine._calculate([Decision("M1", "ESIL")], 18)
    assert lower["districts"]["ESIL"]["final_indicators"]["T1"] == 0
    assert upper["districts"]["ESIL"]["final_indicators"]["T2"] == 100


def test_compare_scenarios_returns_deterministic_b_minus_a_deltas():
    scenario = official_example()
    result = compare_scenarios(scenario, scenario)
    assert result["valid"]
    assert result["score_delta"] == pytest.approx(0)
    assert result["total_cost_delta"] == 0
