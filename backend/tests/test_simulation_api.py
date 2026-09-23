"""HTTP contract checks with real deterministic engine outputs and no LLM calls."""

import json
import pytest
from fastapi.testclient import TestClient

import simulation
from backend.main import app
from backend import simulation_api


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def scenario():
    return {"decisions": [
        {"measure_id": "M7", "district": "NURA"},
        {"measure_id": "M8", "district": "NURA"},
        {"measure_id": "M10", "district": "NURA"},
        {"measure_id": "M12", "district": None},
        {"measure_id": "M5", "district": "SARYARKA"},
    ]}


def test_public_imports_and_validation_are_json_serializable(scenario):
    for name in (
        "simulate_scenario", "validate_scenario", "find_best_scenarios",
        "compare_scenarios", "get_districts", "get_measures", "calculate_baseline",
    ):
        assert callable(getattr(simulation, name))
    result = simulation.validate_scenario(scenario)
    assert json.loads(json.dumps(result)) == result
    assert result["valid"]


@pytest.mark.parametrize("path,function", [
    ("/districts", simulation.get_districts),
    ("/measures", simulation.get_measures),
    ("/baseline", simulation.calculate_baseline),
])
def test_catalog_and_baseline_preserve_engine_json(client, path, function):
    response = client.get(path)
    assert response.status_code == 200
    assert response.json() == function()


def test_health_and_required_routes(client):
    assert client.get("/health").json() == {"status": "ok", "simulation_engine": "available"}
    paths = client.get("/openapi.json").json()["paths"]
    for method, path in [
        ("get", "/health"), ("get", "/districts"), ("get", "/measures"),
        ("get", "/baseline"), ("post", "/simulate"),
        ("post", "/optimize"), ("post", "/compare"),
    ]:
        assert method in paths[path]
    assert "post" in paths["/ai/analyze"]
    assert "post" in paths["/ai/optimize"]


def test_reference_scenario_uses_real_engine(client):
    scenario = {"decisions": [
        {"measure_id": "M2", "district": None},
        {"measure_id": "M3", "district": "NURA"},
        {"measure_id": "M8", "district": "NURA"},
        {"measure_id": "M9", "district": "NURA"},
        {"measure_id": "M14", "district": None},
    ]}
    response = client.post("/simulate", json=scenario)
    assert response.status_code == 200
    assert response.json()["total_cost"] == 98
    assert response.json()["score"] == pytest.approx(57.2367, abs=0.0001)


def test_ai_analyze_runs_simulation_before_missing_key_fallback(client, scenario, monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    response = client.post("/ai/analyze", json=scenario)
    assert response.status_code == 200
    body = response.json()
    assert body["simulation"] == simulation.simulate_scenario(scenario)
    assert body["analysis"] is None
    assert body["aiStatus"]["status"] == "configuration_error"


def test_ai_optimize_uses_only_engine_numbers_on_missing_key(client, scenario, monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    current = simulation.simulate_scenario(scenario)
    candidate = {
        "selected_measures": current["decisions"], "score": current["score"],
        "total_cost": current["total_cost"], "weakest_district": current["weakest_district"],
        "critical_count": current["critical_count"],
    }
    monkeypatch.setattr(simulation, "find_best_scenarios", lambda top_n: [candidate])
    response = client.post("/ai/optimize", json={**scenario, "topN": 1})
    assert response.status_code == 200
    body = response.json()
    assert body["simulation"] == current
    assert body["scenarios"] == [candidate]
    assert body["recommended"]["current_score"] == current["score"]
    assert body["recommended"]["recommended_score"] == candidate["score"]
    assert body["recommended"]["improvement"] == 0
    assert body["recommended"]["reasoning"] is None
    assert body["aiStatus"]["status"] == "configuration_error"


@pytest.mark.parametrize("camel_case", [False, True])
def test_explicit_assignments_preserve_full_result(client, scenario, camel_case):
    expected = simulation.simulate_scenario(scenario)
    if camel_case:
        for decision in scenario["decisions"]:
            decision["measureId"] = decision.pop("measure_id")
    response = client.post("/simulate", json=scenario)
    assert response.status_code == 200
    assert response.json() == expected
    assert response.json()["score"] == pytest.approx(56.54307)


def test_legacy_frontend_payload_and_response_remain_compatible(client, scenario):
    bootstrap = client.get("/bootstrap").json()
    response = client.post("/simulate", json={
        "datasetVersion": bootstrap["datasetVersion"], "districtId": "NURA",
        "actionIds": [item["measure_id"] for item in scenario["decisions"]],
    })
    assert response.status_code == 200
    for decision in scenario["decisions"]:
        if decision["district"] is not None:
            decision["district"] = "NURA"
    expected = simulation.simulate_scenario(scenario)
    result = response.json()
    assert result["projectedScore"] == expected["score"]
    assert result["baselineScore"] == expected["baseline_score"]
    assert result["spent"] == expected["total_cost"]
    assert result["remaining"] == expected["remaining_budget"]
    assert result["scenarioId"]
    assert len(result["metrics"]) == 10


def test_legacy_stale_version_is_rejected(client):
    response = client.post("/simulate", json={
        "datasetVersion": "outdated", "districtId": "NURA", "actionIds": [],
    })
    assert response.status_code == 409


@pytest.mark.parametrize("invalidity", ["count", "city_district", "duplicate", "unknown"])
def test_engine_validation_errors_are_preserved_without_score(client, scenario, invalidity):
    if invalidity == "count":
        scenario["decisions"].pop()
    elif invalidity == "city_district":
        scenario["decisions"][3]["district"] = "NURA"
    elif invalidity == "duplicate":
        scenario["decisions"][-1] = scenario["decisions"][0]
    else:
        scenario["decisions"][0]["measure_id"] = "M999"
    response = client.post("/simulate", json=scenario)
    assert response.status_code == 422
    assert response.json()["detail"] == simulation.simulate_scenario(scenario)
    assert "score" not in response.json()["detail"]


def test_pydantic_models_become_engine_dicts(scenario):
    model = simulation_api.ScenarioRequest.model_validate(scenario)
    assert model.engine_input() == scenario
    assert simulation.validate_scenario(model.engine_input())["valid"]


@pytest.mark.parametrize("camel_case", [False, True])
def test_comparison_preserves_engine_b_minus_a_result(client, scenario, camel_case):
    other = {"decisions": [dict(item) for item in scenario["decisions"]]}
    other["decisions"][-1]["district"] = "NURA"
    keys = ("scenarioA", "scenarioB") if camel_case else ("scenario_a", "scenario_b")
    response = client.post("/compare", json={keys[0]: scenario, keys[1]: other})
    assert response.status_code == 200
    assert response.json() == simulation.compare_scenarios(scenario, other)


def test_comparison_reports_errors_for_both_inputs(client):
    scenario = {"decisions": []}
    response = client.post("/compare", json={"scenario_a": scenario, "scenario_b": scenario})
    assert response.status_code == 422
    assert response.json()["detail"] == simulation.compare_scenarios(scenario, scenario)


@pytest.mark.parametrize("body,requested", [({}, 5), ({"top_n": 2}, 2), ({"topN": 1}, 1)])
def test_optimizer_delegates_and_serializes_without_recalculation(client, monkeypatch, scenario, body, requested):
    # Exhaustive search is covered by simulation/tests/test_optimizer.py.
    # A spy isolates transport and verifies that no ranking/scoring is done here.
    value = simulation.simulate_scenario(scenario)
    candidates = [{
        "selected_measures": value["decisions"], "score": value["score"],
        "total_cost": value["total_cost"], "weakest_district": value["weakest_district"],
        "critical_count": value["critical_count"],
    }]
    calls = []

    def search(*, top_n):
        calls.append(top_n)
        return candidates

    monkeypatch.setattr(simulation, "find_best_scenarios", search)
    response = client.post("/optimize", json=body)
    assert response.status_code == 200
    assert calls == [requested]
    assert response.json() == {"scenarios": candidates}


@pytest.mark.parametrize("top_n", [0, 11, 1.5, True, "2"])
def test_optimizer_rejects_invalid_bounds_and_types(client, top_n):
    assert client.post("/optimize", json={"top_n": top_n}).status_code == 422


def test_client_cannot_supply_a_score(client, scenario):
    assert client.post("/simulate", json={**scenario, "score": 100}).status_code == 422


def test_missing_engine_returns_service_unavailable(client, monkeypatch):
    def missing(name):
        raise ModuleNotFoundError("unavailable", name=name)

    monkeypatch.setattr(simulation_api, "import_module", missing)
    assert client.get("/baseline").status_code == 503
