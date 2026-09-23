"""Backend endpoints mapped to the frontend contract and simulation engine."""
from __future__ import annotations

from hashlib import sha256
from importlib import import_module
import json
from types import ModuleType
from typing import Any

from fastapi import APIRouter, HTTPException

from agents.orchestrator import AIConfigurationError, AIOrchestrator, AIServiceError
from backend.schemas import ActionOut, BootstrapOut, OptimizePlanIn, PlanIn, SimulationOut
from backend.simulation_api import ScenarioRequest, simulate_decisions

router = APIRouter()
_ORCHESTRATOR = AIOrchestrator()

_CATEGORY_IDS = {
    "TRANSPORT": "transport", "ECOLOGY": "green", "SOCIAL": "social",
    "SAFETY": "safety", "SERVICES": "services",
}
_DISTRICT_NAMES = {
    "ESIL": "Есіл", "ALMATY": "Алматы", "SARYARKA": "Сарыарқа",
    "BAIKONUR": "Байқоңыр", "NURA": "Нұра",
}
_ACTION_TITLES = {
    "M1": "Автобус жолақтары", "M2": "Ақылды бағдаршамдар",
    "M3": "Жеңіл рельсті көлік желісі", "M4": "Саябақ немесе сквер",
    "M5": "Жеке секторды таза отынға ауыстыру",
    "M6": "Қаланы көгалдандыру бағдарламасы",
    "M7": "Модульдік мектеп пен балабақша",
    "M8": "Отбасылық денсаулық орталығы", "M9": "Ауладағы спорт хабтары",
    "M10": "Көшені жарықтандыру және камералар",
    "M11": "Қауіпсіз өткелдер мен мектеп аймақтары",
    "M12": "Бірыңғай цифрлық өтініш платформасы",
    "M13": "Жылу және су желілерін жаңғырту",
    "M14": "Коммуналдық авариялық бригадалар",
}
_INDICATOR_LABELS = {
    "T1": "Көлік кептелісін азайту", "T2": "Қоғамдық көлік қолжетімділігі",
    "E1": "Көгалдандыру", "E2": "Ауа сапасы",
    "S1": "Мектептер мен балабақшалар", "S2": "Алғашқы медициналық көмек",
    "B1": "Көшедегі қауіпсіздік", "B2": "Жол қозғалысы қауіпсіздігі",
    "C1": "Коммуналдық желілер сенімділігі", "C2": "Тұрғындар өтініштерін өңдеу",
}


def _simulation_engine() -> ModuleType:
    try:
        return import_module("simulation")
    except ModuleNotFoundError as error:
        if error.name == "simulation" or (error.name and error.name.startswith("simulation.")):
            raise HTTPException(
                status_code=503,
                detail="Simulation engine is unavailable. Integrate feature/simulation first.",
            ) from error
        raise


def _catalog(engine: ModuleType) -> dict[str, Any]:
    districts = engine.get_districts()
    actions = engine.get_measures()
    baseline = engine.calculate_baseline()
    fingerprint = json.dumps(
        {"schema": 1, "districts": districts, "actions": actions,
         "budget": baseline["remaining_budget"], "baselineScore": baseline["baseline_score"]},
        sort_keys=True, ensure_ascii=False, separators=(",", ":"),
    ).encode("utf-8")
    return {
        "datasetVersion": "sim-" + sha256(fingerprint).hexdigest()[:12],
        "cityName": "Астана — синтетическая модель",
        "budget": baseline["remaining_budget"],
        "budgetUnit": "шартты бірлік",
        "districts": districts,
        "actions": actions,
    }


def _bootstrap_payload(engine: ModuleType) -> dict[str, Any]:
    catalog = _catalog(engine)
    district_ids = [str(item["name"]).upper() for item in catalog["districts"]]
    districts_out = [
        {
            "id": str(item["name"]).upper(),
            "name": _DISTRICT_NAMES.get(str(item["name"]).upper(), str(item["name"])),
            "description": "Жобаның синтетикалық моделіндегі аудан.",
            "metrics": [
                {"label": _INDICATOR_LABELS.get(code, code), "value": value, "unit": "/100"}
                for code, value in item["indicators"].items()
            ],
        }
        for item in catalog["districts"]
    ]
    actions_out = []
    for item in catalog["actions"]:
        action_id = str(item["id"]).upper()
        scope = str(item["scope"]).upper()
        category = _CATEGORY_IDS.get(str(item["category"]).upper())
        if category is None:
            raise HTTPException(status_code=502, detail=f"Unsupported simulation category for {action_id}.")
        effects = ", ".join(
            f"{_INDICATOR_LABELS.get(code, code)} {float(value):+g}"
            for code, value in item.get("effects", {}).items()
        )
        action: dict[str, Any] = {
            "id": action_id, "category": category,
            "title": _ACTION_TITLES.get(action_id, item["name"]),
            "description": f"{'Қала бойынша' if scope == 'CITY' else 'Бір ауданға'}; лагы {item['lag']} тоқсан; қозғалтқыштағы әсері: {effects}.",
            "cost": item["cost"],
        }
        if scope != "CITY":
            action["districtIds"] = district_ids
        actions_out.append(action)
    return {
        "datasetVersion": catalog["datasetVersion"], "cityName": catalog["cityName"],
        "budget": catalog["budget"], "budgetUnit": catalog["budgetUnit"],
        "districts": districts_out, "actions": actions_out,
    }


def _prepare_decisions(engine: ModuleType, request: PlanIn) -> tuple[list[dict[str, Any]], str]:
    catalog = _catalog(engine)
    if request.dataset_version != catalog["datasetVersion"]:
        raise HTTPException(status_code=409, detail="Dataset version changed. Reload /bootstrap and submit again.")
    district_id = request.district_id.upper()
    district_ids = {str(item["name"]).upper() for item in catalog["districts"]}
    if district_id not in district_ids:
        raise HTTPException(status_code=422, detail="Unknown districtId.")
    scopes = {str(item["id"]).upper(): str(item["scope"]).upper() for item in catalog["actions"]}
    decisions = []
    for raw_id in request.action_ids:
        action_id = raw_id.upper()
        decision: dict[str, Any] = {"measure_id": action_id}
        if scopes.get(action_id) != "CITY":
            decision["district"] = district_id
        decisions.append(decision)
    return decisions, district_id


def _run_engine(engine: ModuleType, request: PlanIn) -> tuple[list[dict[str, Any]], str, dict[str, Any], str]:
    decisions, district_id = _prepare_decisions(engine, request)
    result = engine.simulate_scenario({"decisions": decisions})
    if not result.get("valid"):
        raise HTTPException(status_code=422, detail={"message": "Invalid scenario.", "errors": result.get("errors", [])})
    return decisions, district_id, result, _catalog(engine)["datasetVersion"]


def _ai_status(error: Exception) -> dict[str, str]:
    if isinstance(error, AIConfigurationError):
        return {"status": "configuration_error", "code": "OPENAI_API_KEY_MISSING", "message": str(error)}
    return {"status": "unavailable", "code": "AI_SERVICE_UNAVAILABLE", "message": str(error)}


@router.get("/health")
def health() -> dict[str, str]:
    try:
        _simulation_engine()
    except HTTPException:
        return {"status": "ok", "simulation_engine": "unavailable"}
    return {"status": "ok", "simulation_engine": "available"}


@router.get("/bootstrap", response_model=BootstrapOut, response_model_exclude_none=True)
def bootstrap() -> dict[str, Any]:
    return _bootstrap_payload(_simulation_engine())


@router.get("/districts")
def districts() -> list[dict[str, Any]]:
    return _simulation_engine().get_districts()


@router.get("/measures")
def measures() -> list[dict[str, Any]]:
    return _simulation_engine().get_measures()


@router.post("/simulate", response_model=SimulationOut | dict[str, Any])
def simulate(request: PlanIn | ScenarioRequest) -> dict[str, Any]:
    if isinstance(request, ScenarioRequest):
        return simulate_decisions(request)
    engine = _simulation_engine()
    _, district_id, result, version = _run_engine(engine, request)
    selected = result["districts"][district_id]
    return {
        "scenarioId": "sim-" + sha256(json.dumps(result, sort_keys=True).encode()).hexdigest()[:16],
        "datasetVersion": version,
        "spent": result["total_cost"],
        "remaining": result["remaining_budget"],
        "baselineScore": result["baseline_score"],
        "projectedScore": result["score"],
        "metrics": [
            {"label": _INDICATOR_LABELS.get(code, code), "before": before,
             "after": selected["final_indicators"][code], "unit": "/100"}
            for code, before in selected["initial_indicators"].items()
        ],
        "assumptions": ["Деректер — синтетикалық модель; бұл нақты қалалық болжам емес."],
    }


@router.post("/ai/analyze")
def analyze(request: PlanIn) -> dict[str, Any]:
    engine = _simulation_engine()
    decisions, _, result, version = _run_engine(engine, request)
    try:
        analysis = _ORCHESTRATOR.analyze(engine, decisions, result)
        return {
            "datasetVersion": version,
            "simulation": result,
            "analysis": {key: value for key, value in analysis.items() if key != "optimized_scenarios"},
            "optimizedScenarios": analysis["optimized_scenarios"],
            "aiStatus": {"status": "available", "source": "openai"},
        }
    except (AIConfigurationError, AIServiceError, ValueError) as error:
        return {
            "datasetVersion": version,
            "simulation": result,
            "analysis": None,
            "optimizedScenarios": [],
            "aiStatus": _ai_status(error),
        }


@router.post("/ai/optimize")
def optimize(request: OptimizePlanIn) -> dict[str, Any]:
    engine = _simulation_engine()
    decisions, _, current, version = _run_engine(engine, request)
    candidates = engine.find_best_scenarios(top_n=request.top_n)
    if not candidates:
        raise HTTPException(status_code=502, detail="Simulation optimizer returned no scenarios.")
    recommended = candidates[0]
    comparison = engine.compare_scenarios(
        {"decisions": decisions},
        {"decisions": recommended["selected_measures"]},
    )
    if not comparison.get("valid"):
        raise HTTPException(status_code=502, detail="Simulation engine could not compare scenarios.")
    facts = {
        "current": current,
        "recommended": recommended,
        "comparison": comparison,
        "other_engine_candidates": candidates[1:],
    }
    try:
        from agents.optimizer_agent import OptimizerExplanation
        from agents.common import ask_agent
        from agents.prompts import OPTIMIZER_PROMPT
        explanation = ask_agent(OPTIMIZER_PROMPT, facts, OptimizerExplanation).reasoning
        status = {"status": "available", "source": "openai"}
    except (AIConfigurationError, AIServiceError) as error:
        explanation = None
        status = _ai_status(error)
    return {
        "datasetVersion": version,
        "simulation": current,
        "scenarios": candidates,
        "recommended": {
            "current_score": current["score"],
            "recommended_score": recommended["score"],
            "improvement": comparison["score_delta"],
            "recommended_scenario": recommended["selected_measures"],
            "reasoning": explanation,
        },
        "aiStatus": status,
    }
