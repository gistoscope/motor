# Codex Cloud Prompt Template (copy/paste)

PROJECT: One-Step Math Engine (pnpm monorepo)

GOAL: <short description>

CONTEXT
- packages/core (pure), packages/parser (pure), packages/tsa (pure), packages/web (React+Vite)
- Aliases single source of truth: `scripts/aliases.mjs`
- Node 20, pnpm, Windows-friendly; dev flag `VITE_EXPERIMENTAL_M0=true`
- Preflight script: `node scripts/dev-preflight.mjs`

WHAT TO BUILD
- <bullet list of deliverables>

TESTS
- packages/tsa: <...>
- packages/web: <...>

ACCEPTANCE CRITERIA
✓ `pnpm install --frozen-lockfile`
✓ `node scripts/dev-preflight.mjs`
✓ `pnpm -r test` is fully green
✓ `pnpm --filter @motor/web dev` runs and `/dev/step` verifies feature

CONSTRAINTS
- Do NOT edit vite/vitest configs except importing aliases from `scripts/aliases.mjs`
- No DOM/React in tsa/parser/core
- Prefer returning a **single unified diff** when PR can't be opened

DELIVERABLES
1) Plan of edits
2) Unified diff
3) Verification steps
