# Backend

FastAPI adapter for the team's simulation engine. The engine owns scenario
validation, costs, effects, and Score. The backend maps engine data to the
frontend contract and asks AI only to explain a server-recomputed result.

## Run locally

From the repository root, with Python 3.10 or newer:

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
Vite environment values.

## Branch integration

The API and simulation code are still on separate branches:
`feature/agents-backend` and `feature/simulation`. Until the engine package
is integrated, `/health` reports it unavailable and engine-dependent routes
return HTTP 503. No simulation or Score calculation is duplicated in backend.
