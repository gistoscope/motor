# AST v1 — Abstract Syntax Tree Passport
**Date:** 2025-09-30
**Status:** Approved
**Spec Version:** 1.0.0

Goals
- Single AST contract for parser, TSA, and printer.
- Modularity and extensibility without auto-simplifications.
- Deterministic history via stable `id` generation.

Principles
- AST = structure only (no evaluate/simplify inside).
- Nodes are immutable; created via factory only.
- Stable IDs via `src/ast/id.ts`.

Node taxonomy (v1)
- Leaves: `Number(value)`, `Variable(name)`
- Unary: `Neg(expr)`, `Group(expr)`
- Binary: `Add(a,b)`, `Sub(a,b)`, `Mul(a,b)`, `Div(a,b)`
- Special: `Frac(numer,denom)`
- Reserve: `FuncCall(name,args[])`

Serialization order: `type`, `id`, node-specific fields (`value|name`), then `children`.

Golden examples: `2+3*4`, `1/2+1/3`, `-(x+1)`.
