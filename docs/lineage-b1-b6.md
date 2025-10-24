# Project Motor — B1→B6 lineage (train‑free)

**Purpose:** Краткая история изменений от B1 к B6 по веткам, локальным параметрам, CI и runtime — **без** упоминаний исторических поездов.

---

## Executive summary (текущее состояние)
- **Default branch (GitHub):** **`sandbox`** (защищаем после зелёного CI).
- **Трек работы:** `sandbox` → feature/* → PR обратно в `sandbox`.
- **Toolchain:** Node 20.19.x, pnpm 9.12.x, TS 5.x, Vitest 2.x/3.x, Husky pre‑push, forbidden‑tokens.
- **Порты:** Vite dev **:5173** (второй UI ворк‑три **:5174** при необходимости).
- **Локальные пути (Windows):** `D:/work/motor-git` (активный клон), `D:/etalon` (golden), `D:/sandbox` (+ опционально `D:/yyy`, `D:/yyy_uiux`).

---

## B1 → B6: ключевые дельты

### B1 (baseline)
- Практика работы через `sandbox` как trunk.
- Добавлены дисциплины: `verify` (root tsc --noEmit), engine‑strict, CI (Node 20 + pnpm), Husky pre‑push, forbidden‑tokens.
- Начало стандартизации локальных путей.

### B2 (hardening)
- Закрепляем `--frozen-lockfile` в CI и локально.
- Усиливаем guard rails: детерминизм snapshot‑ов, «одна операция — одна трансформация».

### B3 (stabilization)
- Консолидация вокруг Vite dev **:5173**.
- Расчистка rough edges, унификация скриптов.

### B4 (web‑demo alignment)
- Добавлен лёгкий demo‑роут (для ручных проверок), но основной способ запуска — Vite **:5173**.

### B6 (current)
- Перевод части пакетов на **композитные сборки TypeScript** (`tsc -b`), чтобы избежать «сквозных» ошибок при линковке типов и ускорить инкрементальные сборки.
- Уточнение канонических путей и CI‑политик.

---

## Политика ветвления (итог)
- Единый рабочий ствол: **`sandbox`**.
- Любая работа только через feature‑ветки → PR в `sandbox`.

---

## Локальные параметры (итог)
- Node/pnpm/TS как в Executive summary.
- Папки и порты как в Executive summary.

---

## CI/качество (итог)
- `verify`=тип‑чек без эмита на корне.
- `-r build`/`-r test` — на все пакеты.
- Husky pre‑push, forbidden‑tokens, `engine-strict`.
- Защита ветки `sandbox` через Rulesets.

---

**Эта версия очищена от любых упоминаний «train5‑8» и заменяет предыдущие «lineage»‑черновики.**
