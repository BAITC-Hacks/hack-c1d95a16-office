# Backend — stage 1

FastAPI adapter for the simulation engine. This stage exposes health, canonical
engine data, and scenario simulation. It does not calculate costs, effects, or
Score in the backend.

## Endpoints

- `GET /health` — API and engine availability.
- `GET /districts` — delegates to `simulation.get_districts()`.
- `GET /measures` — delegates to `simulation.get_measures()`.
- `POST /simulate` — delegates validation and calculation to
  `simulation.simulate_scenario()`.

Example request:

```json
{
  "decisions": [
    {"measure_id": "M7", "district": "NURA"},
    {"measure_id": "M8", "district": "NURA"},
    {"measure_id": "M10", "district": "NURA"},
    {"measure_id": "M12"},
    {"measure_id": "M5", "district": "SARYARKA"}
  ]
}
```

The engine returns its canonical result. Invalid scenarios contain validation
errors and do not contain a numeric Score. Client-supplied costs and scores are
rejected by the request schema.

## Run locally

From the repository root, with Python 3.10 or newer:

```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

OpenAPI UI: `http://127.0.0.1:8000/docs`.

## Integration status

The simulation package currently lives on `feature/simulation`, separately
from `feature/agents-backend`. The API starts without it, reports a degraded
health status, and returns HTTP 503 from engine-dependent routes until the
branches are integrated. No simulation code or Score formula is copied here.

The frontend API document is still marked as a proposal. Its payload format
must be agreed with the team and adapted at the API boundary before wiring the
frontend to these engine-native routes.
