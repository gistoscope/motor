# Bridge API

This document describes the contract between the Motor bridge and a host-provided math engine. It focuses on the three integration touch points that every engine must expose: the `parse` and `execute` entry points, the event subscription surface exposed through `on(event, cb)`, and the error model shared by both commands.

## `parse(input)`

### Signature

```ts
parse(input: string): ParseResult | Promise<ParseResult>
```

### Input

* `input` &mdash; UTF-8 string that contains the user-entered expression. The bridge passes the raw text from the UI without additional normalisation so that engines can apply their own tokenisation and validation rules.

### Success response

The call resolves to a JSON-serialisable `ParseResult`. Engines are free to decide on the exact payload, but it **must** include the original expression to aid with reconciliation inside the bridge. A minimal shape used by the demo stub looks like this:

```json
{
  "type": "parse",
  "input": "2 + 3"
}
```

Engines that compute richer diagnostics can add fields such as an AST, rendered HTML, TeX output, timing information, or warnings.

### Side effects

* The result of `parse` becomes the current exported state. Subsequent calls to `exportState()` (if implemented) should return the same snapshot that was produced during parsing.
* Engines are expected to emit a `state` event (see below) after successfully parsing the expression so the bridge can refresh highlights, token metadata, and the available action list.

### Errors

If the input expression cannot be parsed, reject the promise (or throw synchronously) with an error object that follows the error contract defined in [Error model](#error-model).

## `execute(actionId)`

### Signature

```ts
execute(actionId: string): ExecuteResult | Promise<ExecuteResult>
```

### Input

* `actionId` &mdash; Identifier of the action the user selected. Action identifiers originate from the action lists delivered via `state` or `actions` events.

### Success response

Engines may return any JSON-serialisable payload that describes the outcome of the action. The stub implementation mirrors the call to make it easy to inspect interactions during development:

```json
{
  "type": "execute",
  "actionId": "expr-add"
}
```

### Side effects

* Executing an action should update the internal engine state and emit a `state` event with the new snapshot.
* If the set of available actions changes, emit an `actions` event so the bridge can refresh menus, keyboards, or toolbars.

### Errors

If the identifier is not recognised or the action fails, reject using the error contract described in [Error model](#error-model).

## `on(event, cb)`

### Signature

```ts
on(event: 'state' | 'actions', cb: (payload: unknown) => void): () => void
```

The bridge subscribes to engine events via this method. Implementations should return an unsubscribe function. If the underlying engine only supports `addListener`/`removeListener` pairs, expose them through `on` to keep the contract consistent.

### `state` events

The payload describes the full engine snapshot that the bridge should render. At minimum it must include everything necessary for the UI to display the current expression and offer the next actions. The stub engine publishes the following shape after each parse or execute:

```json
{
  "expression": "2 + 3",
  "evaluation": { "kind": "number", "value": 5 },
  "tokenCount": 3,
  "activeActionId": "expr-add",
  "legalActions": [
    { "id": "expr-add", "label": "2 + 3", "kind": "expression" },
    { "id": "expr-combine", "label": "3x + 2x", "kind": "expression" },
    { "id": "expr-divide", "label": "(a + b) / c", "kind": "expression" }
  ],
  "actions": [
    { "id": "expr-add", "label": "2 + 3", "kind": "expression" },
    { "id": "expr-combine", "label": "3x + 2x", "kind": "expression" },
    { "id": "expr-divide", "label": "(a + b) / c", "kind": "expression" }
  ]
}
```

Values beyond this example (such as token metadata, selection state, previews, etc.) are allowed. The bridge forwards the payload to UI consumers without modification.

### `actions` events

The payload is an array of actions that replaces the current action list. Each entry must include:

* `id` &mdash; Stable identifier used when invoking `execute(actionId)`.
* `label` &mdash; Human-readable description to show in menus and tooltips.
* `kind` &mdash; Optional grouping/category string. The stub categorises every action as `expression`.

Example based on the stub engine:

```json
[
  { "id": "expr-add", "label": "2 + 3", "kind": "expression" },
  { "id": "expr-combine", "label": "3x + 2x", "kind": "expression" },
  { "id": "expr-divide", "label": "(a + b) / c", "kind": "expression" }
]
```

If an engine never emits `actions`, the bridge derives the list from the most recent `state` payload instead.

## Error model

Both `parse` and `execute` must reject with an object that contains the fields below. Additional metadata (for example, validation hints or retry instructions) may be added as needed.

| Code | Default message | When to use |
| ---- | ---------------- | ----------- |
| `invalid_input` | `Expression cannot be parsed.` | The `input` argument is empty, malformed, or violates syntax rules. |
| `unknown_action` | `Action is not available.` | The requested `actionId` is missing from the current `legalActions`/`actions` list. |
| `internal` | `Unexpected engine error.` | Any other failure that prevents the engine from producing a result (e.g., runtime exceptions, network errors). |

Errors should, when possible, be instances of `Error` so stack traces are preserved. The bridge inspects the `code` field to decide how to recover or which message to display.

## Putting it together

The stub engine shipped with the repository satisfies the contract described above. The snippet below illustrates the minimal wiring required to adopt it in a host application:

```ts
import { StubRealMathEngine } from '@motor/web/demo/engine.stub';

const engine = new StubRealMathEngine();
engine.on('state', (snapshot) => {
  console.log('state changed', snapshot);
});
engine.on('actions', (actions) => {
  console.log('available actions', actions);
});

await engine.parse('2 + 3');
await engine.execute('expr-combine');
```

This produces console output matching the JSON samples above and keeps the bridge UI in sync with the engine state.
