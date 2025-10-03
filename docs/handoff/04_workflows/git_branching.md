# Git Branching & PRs

- Base branch: `sandbox`.
- Feature branches: `codex/<feature>`.
- Docs branches: `docs/<topic>`.

**PR checklist**
- [ ] All tests green (`pnpm -r test`).
- [ ] Preflight OK.
- [ ] No alias edits in Vite/Vitest configs.
- [ ] Docs updated (if semantics/UX changed).
- [ ] Short summary + verification steps in PR body.
