## Summary
- [ ] Purpose of this PR
- [ ] Scope (which packages): core / parser / tsa / cli / web

## Checks
- [ ] `pnpm install --frozen-lockfile`
- [ ] `node scripts/generate-aliases.mjs` + `--check`
- [ ] `pnpm verify` (green)
- [ ] `pnpm -r test` (green)
- [ ] No artifacts in diff (`node_modules`, `dist`, `build`, `coverage`, `.cache`, `*.log`)
