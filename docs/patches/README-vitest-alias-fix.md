# Patch: Vitest alias for @motor/tsa

This patch replaces `packages/web/vitest.config.ts` to align aliases with `vite.config.ts`.
It adds proper aliases for `@motor/core`, `@motor/parser`, `@motor/tsa` and enables the `jsdom` test environment.

## Apply

1. Unzip into your repo root (e.g., `D:\workhorse`), allowing overwrite.
2. Run:
   ```powershell
   cd D:\workhorse
   pnpm -r test
   $env:VITE_EXPERIMENTAL_M0="true"
   pnpm --filter @motor/web dev
   ```
