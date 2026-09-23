# QALA — «5 сағатқа әкім»

Member 3 frontend, React + Vite + TypeScript. Changes are limited to `frontend/`.

## Run

Node >=22.18, pnpm:

```sh
cd frontend
pnpm install
cp .env.example .env
pnpm dev
```

PowerShell: use `Copy-Item .env.example .env` instead of `cp`.
Open http://127.0.0.1:5173. Configure `VITE_API_BASE_URL=http://localhost:8000` and restart Vite after changing it. Never put OpenAI or NVIDIA secret keys in VITE variables.

```sh
pnpm test
pnpm build
pnpm preview
```

## Features

Kazakh dashboard, 5 districts, 14 measures, per-measure district selection, budget preview, exactly five decisions, at most two per category, duplicate and conflict validation. Reset clears selections and pending results. Requests are cancelled and stale responses discarded when the plan changes.

Simulation metrics, district before/after charts and all indicator changes come from validated backend responses. No simulation formula or optimizer runs in the frontend. Cost summation and selection validation are UX previews; the backend remains authoritative.

Four AI council cards and optimizer comparison retain real numeric results even when AI text is unavailable. Loading, empty catalog, malformed responses, 400/422, 404, 409, 429, 503, network failures and a 30-second timeout are handled.

## Offline demonstration

If startup API calls fail, an explicit **Демо режимі** banner explains why. Select **Демо сценарийді жүктеу**, then simulate, request the AI council, and open optimizer comparison. These are static presentation fixtures, not live AI or client-side official calculations. The fixture belongs ONLY to M7/NURA, M8/NURA, M10/NURA, M12/CITY, M5/SARYARKA. Arbitrary plans remain editable and validated but cannot receive this fixture's score. Demo optimization compares the same example with itself and explicitly says no optimization was performed.

Use **Backend-ке қайта қосылу** after the server starts. Live action failures display an error instead of silently replacing a real scenario with demo numbers.

## Integration status

Requested routes: GET /health, /districts, /measures, /baseline; POST /simulate, /optimize, /ai/analyze. All requests are centralized in `src/api/client.ts`; runtime response validation and mapping in `src/api/contracts.ts`.

The backend branch inspected at commit `a30f4e10b9fd6dacb6ee58a7c40f0472700e1edc` still contains the older single-district contract, no /baseline, and /ai/optimize instead of /optimize. Therefore live seven-route compatibility is pending Member 2's update; it has not been verified against a running server. See API_CONTRACT_PROPOSAL.md for exact expectations. No backend, agent, or simulation files were changed.
