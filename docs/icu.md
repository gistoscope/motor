# ICU — Interactive Control Unit (Foundation)

Scope: gestures → selection → rendering (Display Window). ICU does NOT parse/apply math.
It maps user intent to SemanticSelection (via Bridge) and reflects VisualSelection.

Interfaces:
- See `packages/web/src/icu/api.ts` (public API).
- Debug flags: `window.__icu` (hoverReady/clickReady/…/selection).

Out of scope: AST parsing, operation validation/apply (TSA/SPE), history mechanics.

VERIFY/ACCEPTANCE:
- TypeScript compiles; no runtime imports added.
- CI stays green; no `/demo` or `/server` changes in this step.

VERIFY:
pnpm run verify
pnpm -r test

ACCEPTANCE:
- No new 404s at :4000 (unchanged).
- Repo hygiene intact; no web imports in core.
