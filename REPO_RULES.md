# Motor repository guardrails

- **Trunk**: `sandbox`
- **Workflow**: Branch from `sandbox` into `feature/*`, then open pull requests back into `sandbox`
- **Package manager**: pnpm only. Always install with `pnpm -w install --frozen-lockfile` in CI.
- **Lockfile hygiene**: Regenerate `pnpm-lock.yaml` when packages change and ensure new importers are present.
- **Husky**: Pre-push must run tests and `scripts/forbidden-tokens.cjs`.
- **Ignored artifacts**: Keep build outputs out of git. `.gitignore` must exclude `dist/` and `*.zip`.
- **Runtime**: `engines.node` must remain on Node.js 20.x.
- **UI invariants**: Preserve paired bracket selections and make transforms one-step reversible.
