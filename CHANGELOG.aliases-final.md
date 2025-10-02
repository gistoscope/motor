# Alias unification (final)

- Single source of truth for `resolve.alias` in both Vite and Vitest.
- Windows-safe `normalizePath` for all replacements.
- Inline local monorepo packages in Vitest 2.x via `test.server.deps.inline`.
- Exclude local packages from `optimizeDeps` prebundle in Vite dev.
