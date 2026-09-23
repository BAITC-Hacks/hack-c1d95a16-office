# Backend integration mapping

Frontend follows backend/API_CONTRACT.md, backend/schemas.py and agents' Pydantic models, inspected at feature/agents-backend commit a30f4e10b9fd6dacb6ee58a7c40f0472700e1edc. This document replaces the earlier seven-route proposal.

## Request

Startup reads /health, /districts, /measures and /bootstrap. The last response supplies datasetVersion and budget=100.

POST /ai/analyze:

```json
{"datasetVersion":"sim-value-from-bootstrap","districtId":"NURA","actionIds":["M7","M8","M10","M12","M5"]}
```

POST /ai/optimize uses the same body plus `"topN":5`.

Current PlanIn permits one common district, not a district per action. Live validation rejects mixed district plans explicitly. Demo fixtures use their own explicitly labelled plan. No cost or score is sent from the client.

## Analysis response

`{simulation: full_engine_result, analysis: {policy,risk,optimizer,executive} | null, aiStatus:{status,message?}}`.

- policy: summary, strengths[], tradeoffs[], district_observations[].
- risk: risk_level (low/medium/high), risks[], critical_findings[], warnings[].
- optimizer: current_score, recommended_score, improvement, recommended_scenario[{measure_id,district?}], reasoning (string/null).
- executive: executive_summary, top_strengths[], main_risks[], recommended_actions[], final_comment.

All five Executive fields are rendered. React escapes strings; no raw HTML is injected. A null analysis leaves the authoritative simulation visible and shows AI unavailability. Incompatible JSON yields a Kazakh error instead of invented fields.

The full engine simulation has valid, total_cost, remaining_budget, score, baseline_score, score_delta, city_average, weakest_district, critical_count, and five districts with initial_score, final_score, initial_indicators, final_indicators, indicator_deltas. All ten indicators are validated. The simulation action calls /ai/analyze directly to obtain this full result; the compact /simulate response is deliberately not expanded using guessed data.

## Optimization response

`{simulation,scenarios:[...],recommended:{improvement,reasoning},aiStatus}`. First engine-ranked scenario supplies score, total_cost, weakest_district, critical_count and selected_measures. Backend improvement is displayed without recalculating Score. Optional comparison.total_cost_delta and critical_count_delta display “Сервер бермеді” if absent. Null reasoning does not remove numeric results.

## Offline and missing fields

Startup failure selects explicit demo mode. Its static example includes all AI sections and Executive fields. It is not a real AI response. The example result is never attached to another arbitrary plan. Frontend contains no official simulation formula.

The backend has no /baseline or /optimize at the inspected revision; earlier seven-route plans are superseded by this concrete integration. Initial scores not supplied by the server remain unavailable until a full calculation is returned.

CORS: allow http://127.0.0.1:5173 and http://localhost:5173. Secret AI keys belong only on the server.
