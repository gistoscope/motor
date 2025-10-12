# @motor/spark

SPARK (Step-Action Reactive Kernel) — headless оркестрационный слой для Motor.
Он предоставляет событийно-ориентированное командное API и остаётся полностью
независимым от UI/DOM. Ядро переносимо и тестируемо и подключается к приложению
через адаптеры (ports & adapters).

## Public API

Единственная точка входа: `createSpark(initialState?)`, возвращает:

- `dispatch(command)` — отправка команды в ядро.
- `subscribe(listener)` — подписка на события; возвращает функцию отписки.
- `getState()` — снимок текущего состояния `SparkState`.

### Commands

- `Select(target)` — обновить активное выделение и пересчитать доступные шаги.
- `Apply(stepId)` — _пока не реализовано; эмитит `Error`._
- `Undo` / `Redo` — _пока не реализовано; эмитят `Error`._
- `Hint` — запросить подсказки на основе текущего выделения.
- `Preview(stepId)` — установить шаг как текущий предпросмотр.

### Events

- `StateChanged(state)` — всякий раз при изменении состояния.
- `StepSuggested(steps[])` — когда появились новые кандидатные шаги.
- `StepApplied(stepId)` — зарезервировано.
- `HoverChanged(range|null)` — зарезервировано.
- `Error({ code, message, meta? })` — структурированная ошибка.

### State Snapshot

`SparkState` включает:

- `ast` — произвольный AST-пейлоад (SPARK не интерпретирует).
- `selection` — текущее выделение или `null`.
- `availableSteps[]` — подсказанные шаги.
- `history` — журнал применённых шагов.
- `preview?` — информация о предпросмотре.

## Isolation & Extensibility

- **Нет** React/DOM/таймеров/IO.
- Коммуникация только командами и событиями.
- В будущих спринтах будут:
  - **Bridge adapters** (`src/bridge/`) для связи с Motor.
  - **Policies** (`src/core/policies.ts`) — правила/ограничения.
  - **Widgets** (`src/widgets/`) — без UI-зависимостей.

## Development

```sh
pnpm install
pnpm -C packages/spark test
pnpm -C packages/spark build
```

Требуемая версия Node: `20.19.5`.

## Next Steps

- Реализовать Apply/Undo/Redo и историю.
- Добавить policy evaluation pipeline.
- Расширить тесты: история, переходы preview → apply, ошибки.
