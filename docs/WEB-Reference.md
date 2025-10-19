# Motor Web Reference

## Engine pane

The engine pane is a lightweight shell for adapting a `MathEngine` instance without the full
playground UI. It is exported as `mountEnginePane()` from `packages/web/src/index.ts` and is
available in the ESM build that powers the demo.

### Markup contract

`mountEnginePane` expects a container element that provides the following data-role slots:

- `data-role="engine-input"` — a text input or `<textarea>` that captures the expression to parse.
- `data-role="engine-display"` — a block element where rendered output is injected. The helper
  toggles two optional children when present: `data-role="engine-display-catx"` for Cortex/CATX
  rendering and `data-role="engine-display-fallback"` for the engine's HTML/tokens.
- `data-role="engine-status"` *(optional)* — receives status or error messages.
- `data-role="engine-info"` *(optional)* — displays engine metadata via `setEngineMeta()`.
- `data-role="engine-apply"` *(optional)* — buttons wired to submit the current input. When
  missing, the helper listens to the parent `<form>`'s submit event or falls back to a blur handler.

Example shell:

```html
<section id="engine-pane">
  <form data-role="engine-form">
    <textarea data-role="engine-input"></textarea>
    <button type="submit" data-role="engine-apply">Render</button>
  </form>
  <div data-role="engine-display">
    <div data-role="engine-display-catx"></div>
    <div data-role="engine-display-fallback"></div>
  </div>
  <p data-role="engine-status"></p>
</section>
```

### Usage

```ts
import { mountEnginePane } from '@motor-web';

const engine = createMathEngine();
const container = document.getElementById('engine-pane');

const pane = mountEnginePane(container, engine, {
  initialExpression: '2 + 3',
  onExpressionChange: (expr) => console.log('rendered', expr),
});

pane.setEngineMeta({ name: 'StubRealMathEngine', origin: 'demo', source: 'stub' });
```

The helper will:

- Mount the engine via `attachMathEngine` and keep the host hidden.
- Listen to `state` events, calling `engine.export()` to refresh the display.
- Attempt CATX rendering by resolving `globalThis.CATX.render()`; on failure it falls back to the
  engine's HTML or a plain-text view of the expression.
- Surface status messages (success, fallback, errors) through the optional status element.

The returned handle exposes:

- `setExpression(expression: string)` — updates the textarea value and re-renders via the engine.
- `getExpression()` — retrieves the latest rendered expression.
- `focusInput()` — focuses the input element.
- `setEngineMeta(meta)` — updates the metadata string shown in `data-role="engine-info"`.
- `destroy()` — detaches listeners and destroys the math bridge.

### CATX integration

`mountEnginePane` shares the CATX wrapper used by the playground (`packages/web/src/ui/catx.ts`).
To enable rich rendering, provide a global renderer before bootstrapping the pane:

```js
import * as CATX from '@motor-lang/cortex-render';

globalThis.CATX = CATX;
```

If no renderer is found or rendering fails, the pane displays the engine's HTML output and marks
`data-mode="html"` on the display container; plain-text fallback marks `data-mode="tex"`.

## Graph playground

The tabbed demo now exposes the engine pane alongside the original graph viewer + math playground.
Selecting the **Graphs** tab restores the previous layout, so existing tests and automation that rely
on `#graph-card` or `#math-playground` continue to function without changes.
