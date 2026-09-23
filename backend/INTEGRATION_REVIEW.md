# Simulation/backend integration review

Reviewed simulation branch at `00e390e` (earlier backend already merged), local
backend snapshot, and freshly fetched `origin/feature/agents-backend` at `e659fb3`.
The remote backend was inspected without merging it or editing that branch.

## Findings and minimal additions

1. **Function names:** all seven public simulation imports exist. Both backend
   snapshots use compatible function names. The remote optimizer agent correctly
   consumes `selected_measures` and `compare_scenarios()['score_delta']`.
2. **Requests:** `PlanIn` accepts one district plus action IDs. It cannot encode
   the official example's NURA/SARYARKA split or arbitrary optimizer assignments.
   `/simulate` now additionally accepts explicit `decisions`. The legacy payload
   and response are preserved. Scenario rules remain exclusively in the engine.
3. **Responses:** the compact frontend response renames score/cost fields and
   omits district-level results, critical counts, contributions and synergies.
   Explicit-decision requests now return the complete engine result. The response
   union prevents FastAPI from filtering that result through `SimulationOut`.
4. **Serialization:** existing catalog and engine outputs are JSON-native;
   no custom encoder is needed. Pydantic decision objects are not engine inputs:
   `Decision.from_value()` expects dictionaries, tuples or engine Decisions.
   `ScenarioRequest.engine_input()` explicitly dumps transport objects into dicts.
   Engine validation returns a dict, not a dataclass. Failure details are preserved.
5. **Missing routes:** `/health`, `/districts`, `/measures`, `/simulate` existed.
   Added `/baseline`, deterministic `/optimize`, and `/compare` in a separate
   `backend/simulation_api.py` router. No AI request or key is needed for them.
6. **Dependencies/imports:** existing schemas use Pydantic 2's ConfigDict and new
   adapters use model_dump. Added an explicit `pydantic>=2,<3` requirement and
   declared pytest/httpx in `requirements-dev.txt`. Import/startup is exercised
   by TestClient; the simulation loader stays lazy for backend-only deployments.

## New remote AI contract: merge considerations

The fetched backend is newer than the backend merged into this branch:

- `/ai/analyze` now accepts `PlanIn` instead of scenarioId/datasetVersion, and
  returns nested analysis plus `aiStatus` instead of the old flat analysis model.
- `/ai/optimize` now accepts `OptimizePlanIn`, including districtId/actionIds,
  instead of datasetVersion/topN alone; its response includes a current scenario,
  recommendation, comparison and AI status.
- The remote removes `analyze_result` from `agents.orchestrator` and removes
  `AnalysisIn`, `AnalysisOut`, `OptimizeIn` from `backend.schemas`. Combining old
  routes with those new files would produce import failures. The coherent remote
  uses `AIOrchestrator` and `OptimizePlanIn` instead; its simulation calls match.

When merging the newer backend, retain its AI imports and route implementations.
Carry over the `ScenarioRequest`/`simulate_decisions` import and early explicit
decision dispatch in `/simulate`, its response union, and the new router inclusion
in `backend/main.py`. The separate deterministic adapter is independent of AI
schemas. No merge or frontend migration is performed by this change.

## Verification and limits

HTTP tests cover JSON serialization, all seven requested paths, legacy frontend
compatibility, multi-district official examples, invalid requests without scores,
comparison direction, optimizer bounds/delegation, and missing-engine handling.
The optimizer HTTP test uses a spy with real engine-produced data; the unchanged
simulation tests exercise actual exhaustive search. No live AI calls are tested.

The frontend implementation is absent from this checkout; compatibility is judged
against the checked-in frontend contract. It must eventually use explicit
decisions to display/edit arbitrary optimizer scenarios. The remote AI payload
changes need a separate frontend integration decision. The synchronous optimizer
can take roughly 90 seconds; callers need a suitable request timeout.
