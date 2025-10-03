# Dev Server & PowerShell Playbook

## Two-window habit
- Window A: `pnpm --filter @motor/web dev` (keep running).
- Window B: git, patches, tests, docs.

## Clean caches (when needed)
```
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process pnpm -ErrorAction SilentlyContinue | Stop-Process -Force
Remove-Item -Recurse -Force .\node_modules\.vite -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .\packages\web\node_modules\.vite -ErrorAction SilentlyContinue
```

## Standard loop
```
$env:VITE_EXPERIMENTAL_M0="true"
pnpm install --frozen-lockfile
node scripts/dev-preflight.mjs
pnpm -r test
pnpm --filter @motor/web dev
```
