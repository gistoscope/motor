# Motor: unify Vite/Vitest aliases for local @motor/* packages

- Replace duplicate/contradictory alias config with a single `resolve.alias` array.
- Point `@motor/core`, `@motor/parser`, `@motor/tsa` directly to `../../*/src/index.ts`.
- Normalize Windows paths via `normalizePath` to avoid backslash issues.
- In `vitest.config.ts`, set `test.environment = "happy-dom"` and inline deps for @motor/* so Vitest resolves sources through Vite.
- Add `server.fs.allow = [repoRoot]` in Vite dev config so `/packages/web` can import from sibling packages during dev.
