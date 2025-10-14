export interface TraceEvent {
  readonly id: string;
  readonly timestamp: string;
  readonly action: string;
  readonly metadata?: Record<string, unknown>;
}

export interface Trace {
  readonly sessionId: string;
  readonly events: TraceEvent[];
}

export interface Intent {
  readonly name: string;
  readonly issuedAt: string;
  readonly payload?: Record<string, unknown>;
}

export interface ActionStep {
  readonly kind: "record" | "notify" | "noop";
  readonly detail: string;
}

export interface ActionPlan {
  readonly steps: ActionStep[];
}

export const traceSchema = {
  type: "object",
  required: ["sessionId", "events"],
  properties: {
    sessionId: { type: "string", minLength: 1 },
    events: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["id", "timestamp", "action"],
        properties: {
          id: { type: "string", minLength: 1 },
          timestamp: { type: "string", format: "date-time" },
          action: { type: "string", minLength: 1 },
          metadata: { type: "object" }
        },
        additionalProperties: true
      }
    }
  },
  additionalProperties: false
} as const;

export type TraceSchema = typeof traceSchema;

export function isTrace(payload: unknown): payload is Trace {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }

  const candidate = payload as Partial<Trace>;
  if (typeof candidate.sessionId !== "string") {
    return false;
  }

  if (!Array.isArray(candidate.events) || candidate.events.length === 0) {
    return false;
  }

  return candidate.events.every((event) => {
    return (
      typeof event === "object" &&
      event !== null &&
      typeof event.id === "string" &&
      typeof event.timestamp === "string" &&
      typeof event.action === "string"
    );
  });
}

export function createActionPlan(intent: Intent): ActionPlan {
  const timestamp = new Date(intent.issuedAt).toISOString();
  const normalizedDetail = intent.payload?.summary ?? intent.name;

  if (!normalizedDetail) {
    return {
      steps: [
        {
          kind: "noop",
          detail: `No-op: ${timestamp}`
        }
      ]
    };
  }

  return {
    steps: [
      { kind: "record", detail: `${timestamp}:${normalizedDetail}` },
      { kind: "notify", detail: intent.name }
    ]
  };
}
