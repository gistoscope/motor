# Dev Troubleshooting (Monorepo, Vite, Vitest)

## Most common fixes

1. Kill stray processes:
   - **PowerShell**:
     ```powershell
     Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
     Get-Process pnpm -ErrorAction SilentlyContinue | Stop-Process -Force
     ```

2. Clean local Vite caches:
   ```powershell
   Remove-Item -Recurse -Force .\node_modules\.vite -ErrorAction SilentlyContinue
   Remove-Item -Recurse -Force .\packages\web\node_modules\.vite -ErrorAction SilentlyContinue
   ```

3. Reinstall deps from lockfile:
   ```powershell
   pnpm install
   ```

4. Run tests & start web:
   ```powershell
   pnpm -r test
   $env:VITE_EXPERIMENTAL_M0="true"
   pnpm --filter @motor/web dev
   # open http://localhost:5173/dev/step
   ```

If tests in **web** fail with "Failed to resolve import @motor/…" — the sentinel test will fail immediately. In that case, check `packages/web/vite.config.ts` and `packages/web/vitest.config.ts` — the aliases for `@motor/core`, `@motor/parser`, and `@motor/tsa` must point to their `src/index.ts` entries, and wildcard subpaths must be handled via the regex rules.
