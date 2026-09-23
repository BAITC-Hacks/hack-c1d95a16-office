# Backend integration draft

**Status:** proposal for the first backend/AI integration step. Route names and payload shapes below are not yet a confirmed runtime contract.

## Responsibilities

- Treat the simulation engine as the source of truth for validation, effects, and Score. The backend must not reimplement the Score formula.
- Build each scenario from the engine's immutable baseline data and authoritative measure catalog; do not trust prices or effects supplied by the client.
- Return validation reasons without a numeric Score when a selection is invalid.
- Let AI explain a server-recomputed, valid simulation result. AI must not invent or recalculate numbers.
- Label live AI output, test mock output, and template fallback output distinctly.

## Draft API surface

These route names come from the handoff plan and need confirmation against the actual app and engine:

- `GET /districts` — expose the fixed synthetic district dataset.
- `GET /measures` — expose the authoritative measure catalog.
- `POST /simulate` — validate a selection and delegate calculation to the simulation engine.
- `POST /ai/analyze` — recalculate the submitted selection server-side, then ask AI to explain that result.
- `POST /ai/optimize` — optional; defer until the basic simulation and explanation path works.

Exact request and response schemas must be agreed with the simulation and frontend members before implementation.

## Validation invariants from the detailed rules

- Budget: 100 virtual units.
- Exactly five unique measures; total cost must not exceed the budget.
- At most two measures per direction.
- District measures require a district; citywide measures do not.
- Apply the listed incompatibilities.
- Invalid selections receive reasons and no Score.

The specification is ambiguous about direction coverage: its introduction can be read as requiring all five directions, while its detailed rules set a maximum of two per direction and give an example without transport. Confirm this before enforcing a five-direction minimum.

## Integration prerequisite

The repository currently contains no simulation engine or application modules. Confirm the engine's actual input/output contract before locking backend schemas or implementing calculations.
