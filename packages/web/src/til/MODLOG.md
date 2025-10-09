# MODLOG

## 2025-10-08

- Added unary minus virtual focus handling utilities (`unary.ts`).
- Added event wiring for unary sign interactions (`events.unary.ts`).
- Added adapter helpers for unary minus focus mapping (`adapter.unary.ts`).
- Added unit tests covering unary behavior (`__tests__/unary.test.ts`).
- (auto) Add Alt-Click expand-to-node layer: astNavigator.ts, events.expand.ts, expand.test.ts
- (auto) CC-5: add tsaAdapter (listActions/canApply/applyOne) and wire real executor in StepDevRoute; dbl-click/Enter now perform one step via TSA and re-render.
