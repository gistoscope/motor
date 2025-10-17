# One-Step Math Engine — Team Handoff Kit (v1)

This kit is a **single, self-contained onboarding package** for new teammates
(UI/graphics team and Math/engine team). Start here, then follow links.

**Contents**
- `01_project_overview.md` — vision, scope, glossary.
- `02_repo_structure.md` — monorepo layout & key folders.
- `03_environment_setup.md` — Node 20 + pnpm + Windows-friendly notes.
- `04_workflows/` — Codex Cloud workflow, branching, CI/testing.
- `05_architecture/` — AMD (Actions/Model/Display) doc & math engine notes.
- `06_guidelines/` — guardrails, UI/UX principles, prompt conventions.
- `07_playbooks/` — dev server, PowerShell, CC17 verification, troubleshooting.
- `08_roadmaps/` — math and UI roadmaps.
- `09_checklists/` — handoff & release checklists.
- `10_templates/` — Codex Cloud prompt template.

**Golden Rules**
1. **One source of truth for aliases:** `scripts/aliases.mjs` (imported by Vite/Vitest).
2. **TSA/parser/core stay PURE:** no DOM/React, serializable in/out.
3. **Keep Windows-friendly tooling** (PowerShell commands provided).
4. **Doc-first:** update docs *before* changing behavior.
5. **Automation-first:** prefer Codex Cloud & scripts over manual steps.
