# Codex Cloud Workflow

## Modes
1. **Small steps (default):** tight feedback loops, minimal risk.
2. **Big runs (experiment):** allow 3–5 steps in one spec. Rule: **accept only if all tests green** (local + CI).
   If anything is red → treat result as **experimental only**, do not push, return to small steps.

## Guardrails to include in each prompt
- Import aliases from `scripts/aliases.mjs` (do not hardcode in Vite/Vitest).
- Keep TSA/parser/core pure; no DOM/React; serializable I/O.
- Explicit Acceptance Criteria with exact commands:
  - `pnpm install --frozen-lockfile`
  - `node scripts/dev-preflight.mjs`
  - `pnpm -r test`
  - `pnpm --filter @motor/web dev`
- Testing requirements (Vitest + happy-dom for web).
- Return **unified diff** if PR cannot be created from Codex env.

## Patch application (local)
```
git checkout -b codex/<feature-name>
# Save the 'git diff' to docs/codex/<name>.patch
git apply --index --whitespace=fix docs/codex/<name>.patch
pnpm -r test
git commit -m "feat: <summary>"
git push -u origin codex/<feature-name>
```

## PR policy
- Green locally **and** green in CI before merge.
- Update docs if behavior/semantics/UI changes.
