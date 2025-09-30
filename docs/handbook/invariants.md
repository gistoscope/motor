# Invariants

- AST objects are immutable snapshots. Use `@motor/ast` helpers to produce new nodes instead of mutating existing ones.
- Teaching steps must not invoke `core.simplify` or any other evaluation routine.
- JSON policy data in `docs/data` is the source of truth for ingest scripts.
