# Architecture Interaction AMD 3-Layer Guide

**Scope:** @motor/web (UI), @motor/tsa (pure engine), @motor/parser (pure), @motor/core (shared)  
**Status:** canonical (doc-first).

## A/M/D
- **Actions (UI):** events, URL/localStorage, selection/hover state, trace, undo/redo.
- **Model (pure):** AST, rules, evaluation, normalization — no DOM/React.
- **Display (UI):** rendering, colors, panels; no math logic.

## Data flow
1) parse → AST  
2) listRuleApplications & getNodeStatus  
3) apply rule → new AST + trace step  
4) evaluate & format  
5) persist `{ expression, selectionPath? }` to URL (replaceState) + localStorage

## Node status
- `applicable` (green) — structural rule exists (or terminal literal when both children are Literal)
- `blocked` (yellow) — could apply after a prerequisite elsewhere
- `invalid` (red) — nothing sensible here

## TSA contracts
- `listRuleApplications(ast)` — structural first; terminal literal only if both sides Literal.
- `applyNextRule` / `applyRule(ast, path, ruleId)` — pure.
- `evaluateExpression`, `reduceAndNormalize`, `parseStage2Expression`, `formatStage2`, `formatRational` — pure.

## Anti-patterns
- DOM/React in TSA; ad-hoc aliases; global mutable state in TSA; pushing URL state on every keystroke.

_Changelog:_ v1 initial.
