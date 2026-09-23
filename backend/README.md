# Backend integration draft

**Status:** interface discovered; API routes and payload schemas remain proposals.

## Confirmed simulation interface

The current engine is on `feature/simulation` (commit `5458bb9`). Its package exports:

```python
from simulation import (
    get_districts,
    get_measures,
    validate_scenario,
    simulate_scenario,
)
```

- `get_districts()` and `get_measures()` return the canonical synthetic data and measure catalog.
- `validate_scenario(scenario)` returns `valid`, `errors`, and `total_cost`.
- `simulate_scenario(scenario)` accepts a sequence of decision mappings, for example `{"measure_id": "M7", "district": "NURA"}`.
- A valid result includes `score`, district and indicator details, measure contributions, cost, and budget remaining.
- An invalid result contains `valid: false`, `errors`, and `total_cost`; it has no numeric Score.

These are observed signatures and return fields from the simulation branch, not new backend calculations.

## Proposed API surface

The following route names come from the handoff plan and still need agreement with the frontend member:

- `GET /districts` — call `get_districts()`.
- `GET /measures` — call `get_measures()`.
- `POST /simulate` — validate and call `simulate_scenario()`; do not duplicate engine rules or math.
- `POST /ai/analyze` — rerun the submitted decisions on the server, then ask AI to explain the resulting engine output. Do not accept a client-supplied Score as authoritative.
- `POST /ai/optimize` — optional; defer until simulation and explanation work end to end.

Exact API request and response schemas are not yet confirmed.

## Validation and AI invariants

- Budget: 100 virtual units; exactly five unique measures; at most two per direction.
- District measures require one district; citywide measures must omit it.
- Apply the engine's incompatibility rules.
- Invalid selections receive validation reasons and no Score.
- The engine owns validation, effects, and Score. AI explains a valid server-computed result; it does not invent numbers.
- Clearly label live AI output, test mock output, and template fallback output.

The specification is ambiguous about requiring representation from all five directions: the detailed rule gives a maximum of two per direction, while the introduction can be read as requiring each direction. Keep the engine's observed behavior unless the team clarifies otherwise.

## Branch integration

The simulation implementation is currently on `feature/simulation`; the backend draft is on `feature/agents-backend`. They do not yet share the simulation files. Coordinate branch integration before claiming the backend path runs end to end.
