# Motor — Unified Stage‑1 (Exact Arithmetic Engine)

**RU | [EN below](#english)**

## Что это
Единый монорепозиторий (**pnpm workspaces**), объединяющий:
- **Кодовая база**: ядро `@motor/core` (рациональная арифметика + символические `sqrt/cbrt`), парсер `@motor/parser` (лексер+рекурсивный спуск для `+ - * / ^ ( ) sqrt cbrt`), CLI `@motor/cli`, демо‑веб `@motor/web` (Vite+React).
- **Дисциплина**: root‑`verify` (тип‑чек без эмита), `.npmrc (engine-strict=true)`, CI (Node 20 + pnpm).
- **Инварианты Stage‑1**: только **точные рационалы**, **только идеальные степени** под корнем (`sqrt(9)=3`, `sqrt(12)` не упрощаем), `evaluate ≡ simplify`, без десятичных приближений.

## Быстрый старт
```powershell
corepack enable
corepack prepare pnpm@9.12.0 --activate
pnpm install
pnpm verify
pnpm -r build
pnpm -r test
pnpm --filter @motor/cli exec motor --demo
pnpm --filter @motor/web dev
```
Откройте http://localhost:5173 — введите выражение вроде `sqrt(9) + 1/3^2` и нажмите **Simplify**.

## Структура
```
/packages
  /core     # ядро: Rational, Expr, Engine (simplify/evaluate/print)
  /parser   # лексер+парсер строк → Expr
  /cli      # бинарь "motor": парсит из аргумента/--demo
  /web      # Vite+React демо: ввод, AST, печать, simplify
```

## Политика корней и степеней
- `sqrt`/`cbrt` остаются **символическими**, кроме **идеальных степеней** (в числителе и знаменателе).
- Никакого `sqrt(a*b) → sqrt(a)*sqrt(b)` и «распила» на Stage‑1.
- `^` допускает **целочисленные** показатели степени.

## English

### What is this
Unified pnpm monorepo merging: a working codebase (core+parser+CLI+web), discipline (verify/engine‑strict/CI), and Stage‑1 invariants (exact rationals, symbolic radicals, perfect powers only).

### Quick start
```bash
corepack enable
corepack prepare pnpm@9.12.0 --activate
pnpm install && pnpm verify && pnpm -r build && pnpm -r test
pnpm --filter @motor/cli exec motor --demo
pnpm --filter @motor/web dev
```


CLI tip: use `pnpm --filter @motor/cli exec motor -- --ast "1/2+1/3"` to print the AST before the result.
