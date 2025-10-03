# Troubleshooting

### Vite/Vitest cannot resolve @motor/* alias
- Ensure `packages/web/vite.config.ts` **and** `packages/web/vitest.config.ts` import from `scripts/aliases.mjs`.
- Clear `.vite` caches as needed (see playbook).

### `scheduler` missing when starting dev server
- Happens if dependencies not installed or lockfile drifted. Run `pnpm install --frozen-lockfile`.

### Tests pass, UI shows "No step available"
- Likely rule ordering/policy mismatch. Verify `listRuleApplications` per policy and `getNodeStatus` results.

### CI fails but local green
- Compare Node version & OS; run exact CI commands locally.
