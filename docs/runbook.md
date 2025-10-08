# Motor Monorepo Runbook

## Environment preparation

1. Ensure Node.js 20.x is available (the workspace targets `>=20 <21`).
2. Enable Corepack so that `pnpm` is provisioned:
   ```bash
   corepack enable
   ```
3. Activate the pinned package manager version:
   ```bash
   corepack prepare pnpm@9.12.0 --activate
   ```
4. Install all workspace dependencies:
   ```bash
   pnpm install
   ```

## Test execution

Run every package test suite from the monorepo root:
```bash
pnpm -r test
```
This delegates to each package's `vitest` configuration. New suites live alongside the existing package-specific tests:
- `packages/core/tests` – core engine and rational arithmetic.
- `packages/parser/tests` – parser fixtures and AST contracts.
- `packages/tsa/tests` – transform step analyzer (TSA) rules.
- `packages/tests` – cross-package integration drivers.

Shared fixtures are stored under `packages/testdata`.

## Extending `invariant-1`

1. Edit `packages/testdata/invariant-1.json` and append a new object matching the schema:
   ```json
   {
     "name": "unique_case_id",
     "input": "(2/3) * (3/4)",
     "expected": "1/2",
     "notes": "todo"
   }
   ```
   - `name`: concise identifier shown in test titles.
   - `input`: Stage 1/2 compatible expression shared across Parser/Core/TSA.
   - `expected`: canonical rational string produced by all evaluators.
   - `notes` (optional): set to `"todo"` to temporarily skip the case.
2. The integration driver at `packages/tests/invariant-1.driver.test.ts` reads the JSON file dynamically, so no code changes are required.
3. Re-run the suite via `pnpm -r test` to validate the new invariant.
