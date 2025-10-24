# Project Motor — Transition & Handoff (train‑free)

**Цель:** единый входной документ для нового чата/участника. Секция 0 — полностью канонические реквизиты (ветка по умолчанию, версии Node/pnpm/TS, команды, локальные пути, порты, гигиена). **Никаких упоминаний «train5‑8»**.

---

## 0) Каноника (последнее состояние)
- **GitHub repo:** `gistoscope/motor` (публичный). Default branch: **`sandbox`** (защищаем после первого зелёного CI).
- **Рабочий трек:** feature‑ветки от `sandbox`, PR → `sandbox`.
- **Инструменты:**
  - **Node 20.19.x**, **pnpm 9.12.0+**, **TypeScript 5.x**, **Vitest 2.x/3.x** (по пакетам), **Husky** (pre‑push), policy **forbidden‑tokens**.
  - Включён `engine-strict` через `.npmrc`.
- **Команды (root):**
  ```bash
  corepack enable
  corepack prepare pnpm@9.12.0 --activate
  pnpm install --frozen-lockfile
  pnpm verify           # тип-чек корня без эмита
  pnpm -r build         # сборка всех пакетов
  pnpm -r test          # тесты всех пакетов
  pnpm --filter @motor/cli exec motor --demo
  pnpm --filter @motor/web dev
  ```
- **Порты:** основной dev‑сервер **Vite :5173** (второй UI‑ворк‑три :5174 при необходимости). Лёгкий demo‑роут допускается, но рекомендуем Vite.
- **Локальные пути (Windows):**
  - Активный клон: `D:/work/motor-git`
  - Golden snapshot (эталон): `D:/etalon`
  - Песочницы/рабочие зоны: `D:/sandbox`, опционально `D:/yyy`, `D:/yyy_uiux`
- **Гигиена репозитория:**
  - _Только полные правки файлов_ (никаких «ручных точечных вставок» внутри).
  - `dist/`, `node_modules/`, `*.zip` в `.gitignore`.
  - Перед пушем — husky pre‑push и локальный `pnpm -r test`.
  - В CI — всегда `--frozen-lockfile`; никогда не отключаем.

---

## 1) Быстрый старт локально (Windows)
1. Открой **PowerShell** →
   ```powershell
   cd D:\work\motor-git
   corepack enable
   corepack prepare pnpm@9.12.0 --activate
   pnpm install --frozen-lockfile
   pnpm verify
   pnpm -r build
   pnpm -r test
   pnpm --filter @motor/web dev
   ```
2. Открой браузер: `http://localhost:5173`.
3. Для CLI‑демо: 
   ```powershell
   pnpm --filter @motor/cli exec motor --demo
   ```

### Замечания
- Ошибки тип‑чека **только** через локальный TypeScript (`pnpm tsc`). В скриптах используем вызов через `pnpm`/`node node_modules/typescript/bin/tsc`.
- Если `verify` ругнётся, фиксируем причину — **не** снимаем `--frozen-lockfile`.

---

## 2) CI / GitHub Actions
- Workflow: `.github/workflows/ci.yml` (Node 20 + pnpm 9, install с `--frozen-lockfile`, `verify`, `-r test`, токен‑полиси).
- После первого зелёного прогона:
  - **Rulesets/Branch protection:** защитить `sandbox`, требовать успешный `ci` и up‑to‑date.
- Политика `forbidden-tokens.cjs` запускается в CI и локально.

---

## 3) Политика ветвления
- `sandbox` — **единственный** рабочий ствол.
- Любая работа → `feature/<кратко‑по‑задаче>` от `sandbox` → PR в `sandbox`.
- Никаких служебных исторических поездов/ветвлений в документации и скриптах.

---

## 4) Стандарты Stage‑1 (guide rails)
- Только точные рационалы; `sqrt`/`cbrt` символические, упрощаются **только** для идеальных степеней.
- `evaluate ≡ simplify` (без десятичных приближений).
- Детерминизм snapshot‑ов (`DOT`, `inspect`, `JSON`).
- «Одна операция — одна трансформация». Пара скобок строго парная.

---

## 5) Пакеты и сборка
- `@motor/core` и `@motor/tsa` — сборка через **`tsc -b`** (композитные проекты). `@motor/parser` — обычный `tsc -p`.
- Внутрипакетные `package.json`:
  - `build`: `tsc -b tsconfig.build.json` (для композитных), либо `tsc -p tsconfig.json`.
  - `test`: `vitest run`.

---

## 6) Релизы / артефакты
- Если собираем релиз, прикрепляем **полный `dist` ZIP** (веб‑демо) + PDF‑отчёт (если есть). В исходниках `dist/` не коммитим.

---

## 7) Как добавлять документацию
- Папка `docs/` — для **неисполняемых** материалов (md, pdf, png). Она исключена из сборок и тестов.
- Шаблон именования: `docs/transition-handoff.train-free.md`, `docs/lineage-b1-b6.md`.
- Сохраняем канонику из Секции 0; никаких упоминаний исторических поездов.

---

**Этот документ замещает предыдущие handoff‑черновики и очищен от любых упоминаний train5‑8.**
