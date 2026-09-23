# Verification — 2026-09-23

- `pnpm test`: PASS, 26 tests in src/api/client.test.ts. Covers request body, simulation response validation, incomplete legacy response rejection, 400/422, missing route, timeout, network fallback, cancellation, AI unavailable, optimizer optional differences, complete demo flow, fixture-plan mismatch, budget/count/category/duplicate/district/conflict validation.
- `pnpm build`: PASS, TypeScript and Vite production bundle.
- Browser http://127.0.0.1:5173: offline startup displayed explicit demo banner; loaded example; simulated (56.54 displayed); AI council and optimizer comparison rendered; reset cleared score and set count 0/5 with simulation disabled.
- Layout inspected at the app's narrow viewport and 1366x900 desktop viewport.
- Actual live backend execution NOT verified: localhost:8000 unavailable. Seven-route backend agreement remains pending; see API_CONTRACT_PROPOSAL.md. Tests use controlled fixtures, not a live server.
- Frontend has no official simulation calculation engine. Demo fixtures are static and restricted to their exact example plan; arbitrary offline scoring is not supported.
