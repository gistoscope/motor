# TIL Protocol 1.0

The TIL protocol establishes a minimal vocabulary for coordinating intents, action plans, execution traces, and errors between cooperating agents. All messages **must** include `protocolVersion: "til/1.0"`.

## Intent

```json
{
  "protocolVersion": "til/1.0",
  "type": "intent",
  "id": "intent-123",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "goal": "Classify the user request",
  "actor": {
    "id": "user-1",
    "role": "user"
  }
}
```

## Action Plan

```json
{
  "protocolVersion": "til/1.0",
  "type": "action_plan",
  "id": "plan-42",
  "intentId": "intent-123",
  "createdAt": "2024-01-01T00:00:05.000Z",
  "steps": [
    {
      "id": "step-1",
      "title": "Select command",
      "status": "pending"
    }
  ]
}
```

## Trace

```json
{
  "protocolVersion": "til/1.0",
  "type": "trace",
  "id": "trace-1",
  "createdAt": "2024-01-01T00:00:10.000Z",
  "entries": [
    {
      "id": "event-1",
      "timestamp": "2024-01-01T00:00:10.000Z",
      "message": "Received intent",
      "level": "info"
    }
  ]
}
```

## Error

```json
{
  "protocolVersion": "til/1.0",
  "type": "error",
  "id": "FSM.INVALID/NEXT",
  "createdAt": "1970-01-01T00:00:00.000Z",
  "code": "FSM.INVALID/NEXT",
  "message": "No transition for \"NEXT\" from \"READY\"",
  "hint": "Select a supported transition before proceeding.",
  "nextSelections": [
    {
      "id": "retry",
      "title": "Retry transition"
    }
  ]
}
```
