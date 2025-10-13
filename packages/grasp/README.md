# @motor/grasp

`@motor/grasp` experiments with a renderer-agnostic selection service that can map between DOM (or host) cursors and structural node identifiers. The package focuses on the data structures and controller logic required to support consistent selection experiences across multiple renderers.

## Project phases

- **P1 — Scaffold**: Establish strict TypeScript types, controller lifecycle, and host adapter contracts with basic selection normalization.
- **P2 — Host bindings**: Implement concrete adapters for DOM and canvas renderers while maintaining paired bracket selection guarantees.
- **P3 — Transform engine**: Introduce reversible, single-step transforms that operate on normalized selections.
- **P4 — Multi-surface collaboration**: Synchronize selections across local and remote peers with optimistic conflict resolution.
- **P5 — Hardening**: Add invariant enforcement, visualization tooling, and regression coverage before shipping to production.
