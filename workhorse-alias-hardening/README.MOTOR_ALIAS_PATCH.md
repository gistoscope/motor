# Motor alias hardening patch

This package aligns Vite and Vitest resolution for `@motor/*` local workspace packages
and disables prebundling/externalization for them. It also adds a minimal alias smoke test.

## Files included
- packages/web/vite.config.ts
- packages/web/vitest.config.ts
- packages/web/src/routes/dev/step/__tests__/alias-smoke.test.ts

## Why this fixes the recurring `Failed to resolve import "@motor/tsa"`:
- It maps both `@motor/tsa` and `@motor/tsa/*` to `packages/tsa/src` using POSIX paths,
  works reliably on Windows.
- Prevents Vite/Vitest from trying to prebundle or treat `@motor/*` as external.
- Mirrors the same rules in both configs to avoid Vite/Vitest drift.
