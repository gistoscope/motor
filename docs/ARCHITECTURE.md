# Architecture Overview

## Monorepo (pnpm workspaces)
- packages/core    числовая алгебра/ядро
- packages/parser  синтаксический разбор входа
- packages/tsa     пошаговый движок (teaching step automation), золотые тесты
- packages/cli     CLI-утилиты
- packages/web     веб-оболочка (dev-страницы, демо, UI-эксперименты)

## Build & Quality
- TypeScript strict; `pnpm verify` = `tsc -p tsconfig.base.json --noEmit`
- husky pre-commit/pre-push  локальная проверка до пуша
- vitest  юнит/золотые тесты пакетов

## UI Topology (packages/web)
- Страницы лежат в `src/routes/**` и открываются прямыми ссылками
  (нет react-router-dom).
- `/dev`  индексная dev-страница-хаб (заголовок + ссылки)
- `/dev/step`  dev-экран работы пошагового движка
- `/demo/highlight`  эксперимент подсветки (Highlight Demo)

## Environments
- sandbox (рабочая ветка, server 5173)
- ui-ux   (экспериментальный UI, server 5174)
- Две рабочие копии через git worktree (D:\yyy и D:\yyy_uiux)
