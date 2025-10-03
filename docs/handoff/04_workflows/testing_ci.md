# Testing & CI

### Local
```
pnpm -r test
```

### What to test
- `packages/tsa`: rule ordering (`listRuleApplications`), `getNodeStatus`, evaluation.
- `packages/web`: render tests (happy-dom) — hover colors, context panel, quick actions, URL/localStorage, undo/redo.

### CI expectations
- Same commands run in CI.
- If a big-run introduces red tests, **discard** and re-scope.
