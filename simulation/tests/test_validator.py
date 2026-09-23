from simulation import validate_scenario


def _valid_example():
    return [
        {"measure_id": "M7", "district": "NURA"},
        {"measure_id": "M8", "district": "NURA"},
        {"measure_id": "M10", "district": "NURA"},
        {"measure_id": "M12"},
        {"measure_id": "M5", "district": "SARYARKA"},
    ]


def test_exactly_five_decisions_required():
    result = validate_scenario(_valid_example()[:-1])
    assert not result["valid"]
    assert any("exactly 5" in error for error in result["errors"])


def test_budget_over_100_is_invalid():
    scenario = [
        ("M3", "ESIL"), ("M5", "ESIL"), ("M7", "ALMATY"),
        ("M13", "SARYARKA"), ("M10", "NURA"),
    ]
    result = validate_scenario(scenario)
    assert result["total_cost"] == 119
    assert any("exceeds budget" in error for error in result["errors"])


def test_duplicate_measure_invalid():
    result = validate_scenario([("M10", "ESIL"), ("M10", "NURA"), ("M4", "ESIL"), ("M7", "ALMATY"), ("M12", None)])
    assert any("only once" in error for error in result["errors"])


def test_city_measure_must_not_specify_district():
    result = validate_scenario([("M12", "ESIL"), ("M7", "NURA"), ("M8", "ESIL"), ("M10", "ALMATY"), ("M5", "SARYARKA")])
    assert any("city measure must not specify" in error for error in result["errors"])


def test_district_measure_requires_exactly_one_district():
    result = validate_scenario([("M7", None), ("M8", "NURA"), ("M10", "ESIL"), ("M12", None), ("M5", "SARYARKA")])
    assert any("requires exactly one district" in error for error in result["errors"])


def test_more_than_two_measures_in_category_invalid():
    result = validate_scenario([("M1", "ESIL"), ("M2", None), ("M3", "NURA"), ("M4", "ALMATY"), ("M10", "SARYARKA")])
    assert any("at most 2" in error for error in result["errors"])


def test_m1_and_m3_incompatible():
    result = validate_scenario([("M1", "ESIL"), ("M3", "NURA"), ("M4", "ALMATY"), ("M8", "SARYARKA"), ("M10", "BAIKONUR")])
    assert any("M1 and M3 are incompatible" in error for error in result["errors"])


def test_m4_and_m7_same_district_invalid():
    result = validate_scenario([("M4", "NURA"), ("M7", "NURA"), ("M8", "ESIL"), ("M10", "ALMATY"), ("M12", None)])
    assert any("M4 and M7 cannot" in error for error in result["errors"])


def test_m4_and_m7_different_districts_allowed():
    result = validate_scenario([("M4", "NURA"), ("M7", "ESIL"), ("M8", "ALMATY"), ("M10", "SARYARKA"), ("M12", None)])
    assert result["valid"], result["errors"]


def test_m5_and_m13_same_district_invalid():
    result = validate_scenario([("M5", "NURA"), ("M13", "NURA"), ("M7", "ESIL"), ("M10", "ALMATY"), ("M12", None)])
    assert any("M5 and M13 cannot" in error for error in result["errors"])

