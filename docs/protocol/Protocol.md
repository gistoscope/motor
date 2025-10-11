# TIL Protocol v1.0

The TIL protocol defines versioned envelopes exchanged between adapters, core policy, and observers. All messages declare `"protocolVersion": "til/1.0"` and validate against the JSON Schemas in `/schemas`.

## Intent

```json
{
  "protocolVersion": "til/1.0",
  "id": "intent-1",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "kind": "Select",
  "actor": "user:123",
  "payload": {
    "targets": ["node-1"]
  }
}
```

## Action Plan

```json
{
  "protocolVersion": "til/1.0",
  "id": "plan-1",
  "intentId": "intent-1",
  "createdAt": "2024-01-01T00:00:01.000Z",
  "steps": [
    { "id": "step-1", "title": "Highlight target", "status": "ready" },
    { "id": "step-2", "title": "Focus panel", "status": "pending" }
  ]
}
```

## Trace

```json
{
  "protocolVersion": "til/1.0",
  "id": "trace-1",
  "planId": "plan-1",
  "intentId": "intent-1",
  "createdAt": "2024-01-01T00:00:02.000Z",
  "events": [
    { "id": "event-1", "at": "2024-01-01T00:00:02.000Z", "type": "highlight", "status": "ok" }
  ]
}
```

## Error

```json
{
  "protocolVersion": "til/1.0",
  "id": "err-1",
  "createdAt": "2024-01-01T00:00:03.000Z",
  "code": "SELECT/INVALID_TARGET",
  "message": "Target node cannot be selected.",
  "hint": "Choose a visible node first.",
  "nextSelections": [
    { "id": "root", "title": "Root node" }
  ]
}
```
