# Guardrails

1) **Aliases:** only from `scripts/aliases.mjs` (both Vite & Vitest import from it).  
2) **Purity:** `@motor/tsa`, `@motor/parser`, `@motor/core` are **pure** — no DOM/React, no side effects.  
3) **Windows-friendly:** provide PowerShell examples; avoid POSIX-only steps.  
4) **Rule policy:** structural first; terminal literal ops only with literal operands.  
5) **No large deps** in `@motor/web` (no KaTeX/MathJax for now).  
6) **Doc-first:** update docs for any change in semantics/UX.
