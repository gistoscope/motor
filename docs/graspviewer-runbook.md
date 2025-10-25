# GraspViewer Runbook

## Overview
GraspViewer is the Stage‑1 GraphJSON explorer that ships with the Motor web demo. It shares the math
engine bridge used by the playground, but layers a hover/preview bus on top of the rendered tokens so
that suggested actions surface immediately via lightweight tooltips. The viewer exposes both the
legacy `.math-token--*` classes and the neutral `.is-*` flags, allowing downstream tooling to migrate
without losing compatibility.

## Environment
- Node.js **20.19.x** with Corepack enabled (`corepack enable`).
- Pinned package manager: `corepack prepare pnpm@9.12.0 --activate`.
- Monorepo install from the workspace root: `pnpm install --frozen-lockfile`.
- CI parity checks remain mandatory: `pnpm run verify` and `pnpm -r test` must stay green.

## Starting the B4 demo server
1. From the repo root run the standard preparation commands:
   ```bash
   pnpm verify
   pnpm -r build
   pnpm -r test
   ```
2. Launch the GraspViewer baseline (B4 demo server) on port **4000**:
   ```bash
   node packages/web/demo/server.mjs
   ```
3. Open `http://localhost:4000` to access the standalone viewer shell. The Vite dev server on
   `http://localhost:5173` remains available in parallel for the full playground.

The server rewrites `@motor/*` imports on the fly and serves the ESM build from `packages/web/src`, so
no additional bundling steps are required.

## Interaction cheatsheet
- **Hover:** Moving the pointer over any token, edge or node applies `.is-hovered` to the target and
  `.is-related` to auxiliary tokens provided by the preview bus. These classes are emitted alongside
  the historic `.math-token--hovered` selector.
- **Single-click brackets:** Clicking on `(`/`)` (or `[`/`]`) highlights the matching pair and leaves
  `.is-related` on the partner so that the scope stays visible without forcing a selection.
- **Tooltips:** Previewed actions are streamed into the existing rule tooltip helper; if the rich UI
  module is absent the viewer falls back to the native `title` attribute.
- **Selection:** Existing shortcuts (`Ctrl/Cmd` + click, undo/redo, scope up/down) continue to work and
  now emit `.is-selected` next to `.math-token--selected`.

## Troubleshooting
- If the hover preview stalls, ensure no other process is holding `:4000` and restart the server.
- Missing tooltips usually mean the math engine does not return legal actions. Check
  `engine.getLegalActions()` in the console or verify the stub engine wiring in
  `packages/web/demo/engine.stub.js`.
- When styling downstream consumers prefer the `.is-*` selectors; the `.math-token--*` variants are
  still emitted for backward compatibility but will eventually be deprecated.
