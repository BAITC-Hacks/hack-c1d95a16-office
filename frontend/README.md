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

## Backend contract

The client now follows backend/API_CONTRACT.md and backend/schemas.py from feature/agents-backend (inspected commit a30f4e10b9fd6dacb6ee58a7c40f0472700e1edc).

Startup: GET /health, /bootstrap, /districts, /measures. Bootstrap supplies the mandatory datasetVersion. The current backend accepts one common district for all district measures. The UI rejects mixed-district live plans with a clear explanation; it never silently changes them.

POST /ai/analyze and /ai/optimize receive `{datasetVersion,districtId,actionIds}`; optimizer additionally receives `topN:5`. All simulation values are taken from the full `simulation` envelope. The simulation button uses /ai/analyze because the documented /simulate view omits district scores, city average and critical count. This also fills the AI council when available. Without an AI key, analysis:null does not hide the simulation.

The requested earlier /baseline and /optimize routes are not in this backend version and are not called. Until a full result arrives, absent baseline scores display an unavailable state rather than a frontend calculation.

Policy, Risk, Optimizer and Executive sections match the backend fields. Executive displays executive_summary, top_strengths, main_risks, recommended_actions and final_comment. Optimizer retains numeric engine results when its AI explanation is unavailable.

See API_CONTRACT_PROPOSAL.md for mapping and limits. A real running backend was unavailable during verification; mocked API contract tests and the offline browser flow passed.
