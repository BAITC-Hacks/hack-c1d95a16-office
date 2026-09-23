# Backend API contract

**Integrated on `feature/simulation`, retaining the existing frontend contract.**
See `INTEGRATION_REVIEW.md` for differences from the newer remote backend branch.
All data and scores come from the simulation engine. The browser never submits a
cost or Score. The engine branch must be integrated with this backend branch
before simulation-dependent routes return data.

## Local setup

- Base URL: `http://127.0.0.1:8000`
- No authentication for the hackathon demo.
- Synchronous JSON requests.
- CORS: `http://127.0.0.1:5173` and `http://localhost:5173`.
- Frontend Vite paths:
  - `VITE_BOOTSTRAP_PATH=bootstrap`
  - `VITE_SIMULATE_PATH=simulate`
  - `VITE_ANALYZE_PATH=ai/analyze`

## Endpoints

### `GET /health`

Returns `{"status":"ok","simulation_engine":"available"}` when the engine is
integrated. Until then, `simulation_engine` is `"unavailable"`; engine-backed
routes return HTTP 503.

### `GET /bootstrap`

Returns frontend-ready synthetic data:

```json
{
  "datasetVersion": "sim-<catalog-hash>",
  "cityName": "Астана — синтетическая модель",
  "budget": 100,
  "budgetUnit": "шартты бірлік",
  "districts": [
    {
      "id": "ESIL",
      "name": "Есіл",
      "description": "Жобаның синтетикалық моделіндегі аудан.",
      "metrics": [{"label": "Көгалдандыру", "value": 68, "unit": "/100"}]
    }
  ],
  "actions": [
    {
      "id": "M7",
      "category": "social",
      "title": "Modular school + kindergarten",
      "description": "Бір ауданға; лагы 3 тоқсан; толық каталог әсері: Мектептер мен балабақшалар +16.",
      "cost": 24,
      "districtIds": ["ESIL", "ALMATY", "SARYARKA", "BAIKONUR", "NURA"]
    }
  ]
}
```

The sample abbreviates the arrays. `datasetVersion` is a stable hash of the
engine's canonical districts, actions, budget, and baseline Score; it changes
when the data or baseline calculation changes. Population counts are omitted because the engine only supplies shares.

### `GET /districts` and `GET /measures`

Return the engine's canonical lists without the frontend display adapter.

### `POST /simulate`

Request:

```json
{
  "datasetVersion": "sim-<catalog-hash>",
  "districtId": "NURA",
  "actionIds": ["M7", "M8", "M10", "M12", "M5"]
}
```

All selected district-scoped measures apply to `districtId`; city-scoped
measures are passed to the engine without a district. The engine checks the
number of decisions, budget, categories, scope, duplicates, and incompatibility
rules. A failed scenario returns HTTP 422 with engine errors and no Score.

Successful response:

```json
{
  "scenarioId": "<opaque-id>",
  "datasetVersion": "sim-<catalog-hash>",
  "spent": 95,
  "remaining": 5,
  "baselineScore": 52.56,
  "projectedScore": 56.54,
  "metrics": [{"label": "Ауа сапасы", "before": 65, "after": 65, "unit": "/100"}],
  "assumptions": ["Деректер — синтетикалық модель; бұл нақты қалалық болжам емес."]
}
```

Values above are illustrative; the engine supplies the actual scores and
metrics. A successful scenario is retained in bounded process memory for
subsequent analysis. Restarting the server expires scenario IDs.

### `POST /ai/analyze`

Request (browser sends identifiers only):

```json
{"scenarioId": "<opaque-id>", "datasetVersion": "sim-<catalog-hash>"}
```

Optional `mode` may be `auto`, `live`, `mock`, or `template`.
`auto` uses live AI when an API key is configured and otherwise supplies a
rule-based explanation. The server looks up and recomputes the stored decisions
before analysis.

Response:

```json
{
  "scenarioId": "<opaque-id>",
  "summary": "…",
  "strengths": ["…"],
  "risks": ["…"],
  "recommendations": ["…"],
  "source": "template_fallback"
}
```

`source` identifies `live`, `mock`, `template`, or
`template_fallback`. The summary is prefixed with the source label so the
current frontend, which strips unknown fields, still displays the analysis mode.

### `POST /ai/optimize`

Request:

```json
{"datasetVersion": "sim-<catalog-hash>", "topN": 3}
```

`topN` is optional (default 5, range 1–10). The route delegates the search
to `simulation.find_best_scenarios()` and returns its engine-computed ranking:

```json
{"datasetVersion": "sim-<catalog-hash>", "scenarios": [{"score": 56.5, "total_cost": 95}]}
```

The example is abbreviated. This endpoint does not recalculate or alter the
engine's candidate scores.

### `GET /docs`

FastAPI-generated OpenAPI page for request and response schemas.

## Additional deterministic interface

These endpoints require no AI key and obtain every numerical result directly
from `simulation/`. Pydantic inputs become ordinary dictionaries before entering
the engine. Unknown request fields (including costs or scores) return HTTP 422.

### `GET /baseline`

Returns the complete `calculate_baseline()` result.

### `POST /simulate` with per-decision district assignments

The legacy request and compact response above remain supported. Alternatively:

```json
{"decisions": [
  {"measure_id": "M7", "district": "NURA"},
  {"measure_id": "M8", "district": "NURA"},
  {"measure_id": "M10", "district": "NURA"},
  {"measure_id": "M12", "district": null},
  {"measure_id": "M5", "district": "SARYARKA"}
]}
```

`measureId` is an alias for `measure_id`. City decisions omit district or use
null, never the literal string `CITY`. Returns the complete `simulate_scenario()`
result, including all district details and contributions. No fields are rounded
or discarded. This form uses the current engine dataset and does not accept
`datasetVersion` or create a stored AI scenario ID. Do not mix request forms;
existing AI routes retain their own contracts.

### `POST /optimize`

Send `{"top_n": 5}` (alias `topN`), or `{}` for the default 5. The bound is an
integer from 1 to 10. Returns `{"scenarios": [...]}` containing the unmodified
`find_best_scenarios()` ranking. Submit a candidate's `selected_measures` as
`decisions` to simulate it. This is separate from `/ai/optimize` and needs no
dataset version. Exhaustive search is synchronous; allow roughly 90 seconds
on the development machine.

### `POST /compare`

Send `{"scenario_a": {"decisions": [...]}, "scenario_b": {"decisions": [...]}}`.
Aliases `scenarioA` and `scenarioB` are accepted. Returns the full engine
comparison; differences are **B minus A**.

For explicit `/simulate` and `/compare`, an invalid scenario yields HTTP 422
with the complete engine failure under `detail`, including all errors and no
score. JSON type errors use the standard FastAPI validation response. Missing
simulation packages yield HTTP 503 on the deterministic routes.
