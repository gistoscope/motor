# Repository Structure (pnpm workspace)

```
/packages
  /core      # shared utils (pure TS)
  /parser    # expression parser/formatter (pure TS)
  /tsa       # step engine (pure TS, no DOM/React)
  /web       # React UI (Vite)
/scripts
  aliases.mjs           # SINGLE SOURCE OF TRUTH for @motor/* aliases
  dev-preflight.mjs     # env checks (Node 20, flags, files)
```

### Branching & main lines
- Primary development base: `sandbox`.
- Docs branches example: `docs/stage-1_5-spec`, `docs/interaction-amd`.
- Feature branches example: `codex/interactive-i1-i2-undo`.

See `04_workflows/git_branching.md` for details.
