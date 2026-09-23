# Seven-endpoint integration contract — pending backend confirmation

Inspected backend/API_CONTRACT.md, backend/schemas.py and backend/routes.py at backend commit a30f4e10b9fd6dacb6ee58a7c40f0472700e1edc. They still use `{datasetVersion,districtId,actionIds}`, GET /bootstrap and POST /ai/optimize. /baseline and /optimize are absent; /simulate returns only a single district view. This cannot represent different districts for different measures or the requested five-district result. Frontend does not silently transform multiple districts into one.

The requested seven-route interface below is implemented in the client and is a PROPOSAL until Member 2 publishes it. Catalog and engine result fields follow the existing simulation engine shapes; council fields follow the existing backend AI response.

## Input

POST /simulate, /optimize and /ai/analyze:

```json
{"decisions":[{"measure_id":"M7","district":"NURA"},{"measure_id":"M8","district":"NURA"},{"measure_id":"M10","district":"NURA"},{"measure_id":"M12"},{"measure_id":"M5","district":"SARYARKA"}]}
```

No cost, score or effect is sent. City measures omit district. Backend must enforce all official rules.

## Responses

- GET /health: `{status:"ok",simulation_engine:"available"}`.
- GET /districts: array `{name: ESIL|ALMATY|SARYARKA|BAIKONUR|NURA, population_share:number, indicators:{T1,T2,E1,E2,S1,S2,B1,B2,C1,C2}}`.
- GET /measures: array `{id,name,category:TRANSPORT|ECOLOGY|SOCIAL|SAFETY|SERVICES,scope:DISTRICT|CITY,cost,lag,effects:{indicator:number}}`.
- GET /baseline and POST /simulate: full engine result `{valid:true,total_cost,remaining_budget,score,baseline_score,score_delta,city_average,weakest_district,critical_count,districts:{ESIL:{initial_score,final_score,initial_indicators,final_indicators,indicator_deltas},...all five}}`. Baseline cost=0, remaining=100. All ten indicators and deltas required per district. Partial numbers are not invented.
- POST /ai/analyze: `{analysis:{policy,risk,optimizer,executive}|null,aiStatus:{status,message?}}`, with existing backend council field names. Missing AI configuration shows an unavailable message; simulation result stays visible.
- POST /optimize: existing optimizer envelope `{simulation:full_engine_result,scenarios:[{score,total_cost,weakest_district,critical_count,selected_measures:[{measure_id,district?}]}],recommended:{improvement:number},comparison?:{total_cost_delta,critical_count_delta}}`. First scenario is backend-ranked best. Optional differences show “Сервер бермеді” when omitted.

Exact executable schemas: src/api/contracts.ts. Errors: non-2xx, or `{valid:false}`. CORS must allow http://127.0.0.1:5173 and http://localhost:5173.

## Member 2 action items

1. Confirm/update the per-decision district request instead of PlanIn's single district.
2. Expose /baseline, /optimize and full simulation output without reducing to SimulationOut.
3. Confirm optimizer envelope and that scenarios[0] is recommended.
4. Send actual OpenAPI/JSON fixtures so contract tests can use server-produced samples.

Until then the UI provides explicitly labelled static demo fixtures. No fabricated response is presented as a live calculation.
