# Project Overview

**Project:** One-Step Math Engine (pnpm monorepo)  
**Goal:** interactive, step-by-step math transformation engine with a clean UI/UX.

### Scope by package
- `packages/web` — React + Vite UI (dev route: `/dev/step`).
- `packages/tsa` — math step engine (pure TypeScript).
- `packages/parser` — pure parsing/formatting helpers.
- `packages/core` — shared rational math & utilities.

### What the user gets
- Rendered expression.
- Click/hover interactivity with color semantics (green/yellow/red).
- Right-click context panel with rules & reasons.
- One-click rule application, trace view, Undo/Redo, Auto-run.
- URL + localStorage state persistence.

### Glossary (short)
- **AST** — Abstract Syntax Tree of the expression.
- **Rule** — transformation step (e.g., `divFractionsToReciprocal`).
- **Trace** — ordered list of applied rules.
- **Path** — array locating a node from root, e.g. `[1,0,2]`.
