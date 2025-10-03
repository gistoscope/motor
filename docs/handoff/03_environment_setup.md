# Environment Setup (Windows-friendly)

- **Node 20**
- **pnpm** (workspace)
- **PowerShell**

### Dev flag
```
$env:VITE_EXPERIMENTAL_M0="true"
```

### Core commands
```
pnpm install --frozen-lockfile
node scripts/dev-preflight.mjs
pnpm -r test
pnpm --filter @motor/web dev
```

Open http://localhost:5173/dev/step
