# Backend

FastAPI adapter for the team's simulation engine. The engine owns scenario
validation, costs, effects, and Score. The backend maps engine data to the
frontend contract and asks AI only to explain a server-recomputed result.

## Run locally

From the repository root, with Python 3.11 or newer:

```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn backend.main:app --reload
```

Set `OPENAI_API_KEY` in the local `.env` only to enable live explanations.
Without a key, `/ai/analyze` uses the labelled rule-based fallback. The key
must never be committed or sent to the frontend.

OpenAPI UI: `http://127.0.0.1:8000/docs`.

## API

See [API_CONTRACT.md](API_CONTRACT.md) for routes, JSON shapes, and frontend
Vite environment values. The deterministic interface also exposes `/baseline`,
`/optimize`, `/compare`, and explicit per-decision `/simulate` requests.

## Branch integration

This branch includes the simulation package and an earlier backend merge.
See [INTEGRATION_REVIEW.md](INTEGRATION_REVIEW.md) before merging the newer
`feature/agents-backend` AI work. Numerical logic remains in `simulation/`.

## Tests

Install `requirements-dev.txt` and run `python -m pytest -q` from the repository
root. HTTP adapter tests run without AI calls. The existing optimizer tests
perform the exhaustive search, so the full suite may take about 90 seconds.
