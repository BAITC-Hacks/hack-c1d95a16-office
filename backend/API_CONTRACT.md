# Backend API contract

**Implemented on `feature/agents-backend`; use this contract when wiring the frontend.**
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
      "description": "Бір ауданға; лагы 3 тоқсан; әсері: Мектептер мен балабақшалар +14.",
      "cost": 24,
      "districtIds": ["ESIL", "ALMATY", "SARYARKA", "BAIKONUR", "NURA"]
    }
  ]
}
```

The sample abbreviates the arrays. `datasetVersion` is a stable hash of the
engine's canonical districts, actions, and budget; it changes when that data
changes. Population counts are omitted because the engine only supplies shares.

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
`template_fallback`. The frontend's current Zod schema ignores this extra
field; it may add it if the UI should display the analysis mode.

### `GET /docs`

FastAPI-generated OpenAPI page for request and response schemas.
