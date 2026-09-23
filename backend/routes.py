"""Backend endpoints mapped to the frontend contract and simulation engine."""
from __future__ import annotations

from collections import OrderedDict
from hashlib import sha256
from importlib import import_module
import json
from threading import RLock
from types import ModuleType
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, HTTPException

from agents.orchestrator import AIServiceError, analyze_result
from backend.schemas import (
    ActionOut,
    AnalysisIn,
    AnalysisOut,
    BootstrapOut,
    OptimizeIn,
    PlanIn,
    SimulationOut,
)

router = APIRouter()
_SCENARIO_LIMIT = 256
_scenarios: OrderedDict[str, dict[str, Any]] = OrderedDict()
_scenarios_lock = RLock()

_CATEGORY_IDS = {
    "TRANSPORT": "transport",
    "ECOLOGY": "green",
    "SOCIAL": "social",
    "SAFETY": "safety",
    "SERVICES": "services",
}
_DISTRICT_NAMES = {
    "ESIL": "Есіл",
    "ALMATY": "Алматы",
    "SARYARKA": "Сарыарқа",
    "BAIKONUR": "Байқоңыр",
    "NURA": "Нұра",
}
_INDICATOR_LABELS = {
    "T1": "Жолдардың өткізу қабілеті",
    "T2": "Қоғамдық көлік қолжетімділігі",
    "E1": "Көгалдандыру",
    "E2": "Ауа сапасы",
    "S1": "Мектептер мен балабақшалар",
    "S2": "Алғашқы медициналық көмек",
    "B1": "Көшедегі қауіпсіздік",
    "B2": "Жол қозғалысы қауіпсіздігі",
    "C1": "Коммуналдық желілер сенімділігі",
    "C2": "Тұрғындар өтініштерін өңдеу",
}


def _simulation_engine() -> ModuleType:
    """Load the team's package when the simulation branch is integrated."""
    try:
        return import_module("simulation")
    except ModuleNotFoundError as error:
        if error.name == "simulation" or (
            error.name is not None and error.name.startswith("simulation.")
        ):
            raise HTTPException(
                status_code=503,
                detail=(
                    "Simulation engine is unavailable. Integrate "
                    "feature/simulation with the backend branch first."
                ),
            ) from error
        raise


def _catalog(engine: ModuleType) -> dict[str, Any]:
    districts = engine.get_districts()
    actions = engine.get_measures()
    baseline = engine.calculate_baseline()
    budget = baseline["remaining_budget"]
    fingerprint = json.dumps(
        {
            "schema": 1,
            "districts": districts,
            "actions": actions,
            "budget": budget,
        },
        sort_keys=True,
        ensure_ascii=False,
        separators=(",", ":"),
    ).encode("utf-8")
    version = "sim-" + sha256(fingerprint).hexdigest()[:12]
    return {
        "datasetVersion": version,
        "cityName": "Астана — синтетическая модель",
        "budget": budget,
        "budgetUnit": "шартты бірлік",
        "districts": districts,
        "actions": actions,
    }


def _bootstrap_payload(engine: ModuleType) -> dict[str, Any]:
    catalog = _catalog(engine)
    district_out: list[dict[str, Any]] = []
    for district in catalog["districts"]:
        district_id = str(district["name"]).upper()
        district_out.append(
            {
                "id": district_id,
                "name": _DISTRICT_NAMES.get(district_id, district_id),
                "description": "Жобаның синтетикалық моделіндегі аудан.",
                "metrics": [
                    {
                        "label": _INDICATOR_LABELS.get(code, code),
                        "value": value,
                        "unit": "/100",
                    }
                    for code, value in district["indicators"].items()
                ],
            }
        )

    district_ids = [item["id"] for item in district_out]
    actions_out: list[dict[str, Any]] = []
    for action in catalog["actions"]:
        action_id = str(action["id"]).upper()
        scope = str(action["scope"]).upper()
        category = _CATEGORY_IDS.get(str(action["category"]).upper())
        if category is None:
            raise HTTPException(
                status_code=502,
                detail=f"Unsupported simulation category for {action_id}.",
            )
        effects = action.get("effects", {})
        effect_text = ", ".join(
            f"{_INDICATOR_LABELS.get(code, code)} {float(amount):+g}"
            for code, amount in effects.items()
        )
        scope_text = "Қала бойынша" if scope == "CITY" else "Бір ауданға"
        description = (
            f"{scope_text}; лагы {action['lag']} тоқсан; әсері: {effect_text}."
        )
        action_data: dict[str, Any] = {
            "id": action_id,
            "category": category,
            "title": action["name"],
            "description": description,
            "cost": action["cost"],
        }
        if scope != "CITY":
            action_data["districtIds"] = district_ids
        actions_out.append(action_data)

    return {
        "datasetVersion": catalog["datasetVersion"],
        "cityName": catalog["cityName"],
        "budget": catalog["budget"],
        "budgetUnit": catalog["budgetUnit"],
        "districts": district_out,
        "actions": actions_out,
    }


def _remember_scenario(
    scenario_id: str,
    dataset_version: str,
    decisions: list[dict[str, Any]],
    district_id: str,
) -> None:
    with _scenarios_lock:
        _scenarios[scenario_id] = {
            "datasetVersion": dataset_version,
            "decisions": decisions,
            "districtId": district_id,
        }
        _scenarios.move_to_end(scenario_id)
        while len(_scenarios) > _SCENARIO_LIMIT:
            _scenarios.popitem(last=False)


@router.get("/health")
def health() -> dict[str, str]:
    """The HTTP service is healthy even when its separately developed engine is absent."""
    try:
        _simulation_engine()
    except HTTPException:
        return {"status": "ok", "simulation_engine": "unavailable"}
    return {"status": "ok", "simulation_engine": "available"}


@router.get("/bootstrap", response_model=BootstrapOut, response_model_exclude_none=True)
def bootstrap() -> dict[str, Any]:
    """Return frontend-ready synthetic data derived from the simulation package."""
    engine = _simulation_engine()
    return _bootstrap_payload(engine)


@router.get("/districts")
def districts() -> list[dict[str, Any]]:
    """Return the engine's canonical district records."""
    return _simulation_engine().get_districts()


@router.get("/measures")
def measures() -> list[dict[str, Any]]:
    """Return the engine's canonical intervention catalog."""
    return _simulation_engine().get_measures()


@router.post("/simulate", response_model=SimulationOut)
def simulate(request: PlanIn) -> dict[str, Any]:
    """Map frontend IDs to engine decisions; let the engine validate and score."""
    engine = _simulation_engine()
    catalog = _catalog(engine)
    if request.dataset_version != catalog["datasetVersion"]:
        raise HTTPException(
            status_code=409,
            detail="Dataset version changed. Reload /bootstrap and submit again.",
        )

    district_id = request.district_id.upper()
    district_ids = {
        str(district["name"]).upper() for district in catalog["districts"]
    }
    if district_id not in district_ids:
        raise HTTPException(status_code=422, detail="Unknown districtId.")

    scopes = {
        str(action["id"]).upper(): str(action["scope"]).upper()
        for action in catalog["actions"]
    }
    decisions: list[dict[str, Any]] = []
    for raw_action_id in request.action_ids:
        action_id = raw_action_id.upper()
        decision: dict[str, Any] = {"measure_id": action_id}
        if scopes.get(action_id) != "CITY":
            decision["district"] = district_id
        decisions.append(decision)

    result = engine.simulate_scenario({"decisions": decisions})
    if not result.get("valid"):
        raise HTTPException(
            status_code=422,
            detail={"message": "Invalid scenario.", "errors": result.get("errors", [])},
        )

    selected_district = result["districts"][district_id]
    initial = selected_district["initial_indicators"]
    final = selected_district["final_indicators"]
    metrics = [
        {
            "label": _INDICATOR_LABELS.get(code, code),
            "before": initial[code],
            "after": final[code],
            "unit": "/100",
        }
        for code in initial
    ]
    scenario_id = str(uuid4())
    _remember_scenario(
        scenario_id,
        catalog["datasetVersion"],
        decisions,
        district_id,
    )
    return {
        "scenarioId": scenario_id,
        "datasetVersion": catalog["datasetVersion"],
        "spent": result["total_cost"],
        "remaining": result["remaining_budget"],
        "baselineScore": result["baseline_score"],
        "projectedScore": result["score"],
        "metrics": metrics,
        "assumptions": [
            "Деректер — синтетикалық модель; бұл нақты қалалық болжам емес."
        ],
    }


@router.post("/ai/analyze", response_model=AnalysisOut)
def analyze(request: AnalysisIn) -> dict[str, Any]:
    """Recompute a server-stored scenario before asking for an explanation."""
    engine = _simulation_engine()
    catalog = _catalog(engine)
    if request.dataset_version != catalog["datasetVersion"]:
        raise HTTPException(
            status_code=409,
            detail="Dataset version changed. Reload data and simulate again.",
        )

    with _scenarios_lock:
        saved = _scenarios.get(request.scenario_id)
        if saved is not None:
            _scenarios.move_to_end(request.scenario_id)
    if saved is None:
        raise HTTPException(
            status_code=404,
            detail="Scenario not found or expired; simulate it again.",
        )
    if saved["datasetVersion"] != request.dataset_version:
        raise HTTPException(status_code=409, detail="Scenario dataset version mismatch.")

    result = engine.simulate_scenario({"decisions": saved["decisions"]})
    if not result.get("valid"):
        raise HTTPException(
            status_code=409,
            detail="Stored scenario is no longer valid for the current engine data.",
        )
    try:
        explanation = analyze_result(result, request.mode)
    except AIServiceError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    return {
        "scenarioId": request.scenario_id,
        **explanation,
    }


@router.post("/ai/optimize")
def optimize(request: OptimizeIn) -> dict[str, Any]:
    """Delegate candidate search to the simulation engine's optimizer."""
    engine = _simulation_engine()
    catalog = _catalog(engine)
    if request.dataset_version != catalog["datasetVersion"]:
        raise HTTPException(
            status_code=409,
            detail="Dataset version changed. Reload /bootstrap and submit again.",
        )
    scenarios = engine.find_best_scenarios(top_n=request.top_n)
    return {
        "datasetVersion": catalog["datasetVersion"],
        "scenarios": scenarios,
    }
