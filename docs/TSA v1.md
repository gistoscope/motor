# TSA v1 — Transform • Support • Augmentation Passport
**Date:** 2025-09-30
**Status:** Approved
**Spec Version:** 1.0.0

Goals
- Atomic learning steps (one thought = one action).
- Separate analysis (legality/hints) from mutation (transforms).
- Plugin model for extensions (e.g., trig).

Invariants
- Only transforms mutate AST; each has cost=1.
- No compound operations in a single step.
- Preview (dry-run) must match the applied result.
