# Local alias final fix

- Use POSIX-normalized absolute paths in Vite/Vitest `resolve.alias` so that Windows backslashes never break resolution.
- Mirror the alias map between `vite.config.ts` and `vitest.config.ts`.
- Keep `@motor/*` out of `optimizeDeps` so Vite does not prebundle workspace packages as externals.
- Add a minimal smoke test to ensure `@motor/tsa` resolves under Vitest.
