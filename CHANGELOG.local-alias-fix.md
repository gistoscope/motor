# Local Dev Alias Fix

- Unifies Vite/Vitest aliases so `@motor/core`, `@motor/parser`, and `@motor/tsa` always resolve to monorepo sources.
- Forces Vite to exclude these from optimizeDeps and grants FS access to the monorepo root.
- Sets Vitest environment to `happy-dom` to avoid external `jsdom` dependency.

## Apply
- Extract this ZIP into the *root* of your local repo (so `packages/...` paths line up).
- Then run:

    pnpm -r test
    $env:VITE_EXPERIMENTAL_M0="true"   # PowerShell
    pnpm --filter @motor/web dev

- Open http://localhost:5173/dev/step
