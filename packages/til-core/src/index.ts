export type ISODateTimeString = string;

export interface Intent {
  protocolVersion: "til/1.0";
  type: "intent";
  id: string;
  createdAt: ISODateTimeString;
  goal?: string | null;
}

export interface ActionPlanStep {
  id: string;
  title: string;
  status: "pending" | "completed" | "failed";
  command: string;
  description?: string;
}

export interface ActionPlan {
  protocolVersion: "til/1.0";
  type: "action_plan";
  id: string;
  intentId: string;
  createdAt: ISODateTimeString;
  steps: ActionPlanStep[];
}

export interface TraceEntry {
  id: string;
  timestamp: ISODateTimeString;
  message: string;
  level: "info" | "warn" | "error";
  data?: Record<string, unknown>;
}

export interface Trace {
  protocolVersion: "til/1.0";
  type: "trace";
  id: string;
  createdAt: ISODateTimeString;
  entries: TraceEntry[];
}

export const intentSchema = {
  type: "object",
  required: ["protocolVersion", "type", "id", "createdAt"],
  properties: {
    protocolVersion: { const: "til/1.0" },
    type: { const: "intent" },
    id: { type: "string" },
    createdAt: { type: "string", format: "date-time" },
    goal: { type: "string" },
  },
} as const;

export const actionPlanSchema = {
  type: "object",
  required: ["protocolVersion", "type", "id", "intentId", "createdAt", "steps"],
  properties: {
    protocolVersion: { const: "til/1.0" },
    type: { const: "action_plan" },
    id: { type: "string" },
    intentId: { type: "string" },
    createdAt: { type: "string", format: "date-time" },
    steps: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "title", "status", "command"],
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          status: { enum: ["pending", "completed", "failed"] },
          command: { type: "string" },
          description: { type: "string" },
        },
      },
    },
  },
} as const;

export const traceSchema = {
  type: "object",
  required: ["protocolVersion", "type", "id", "createdAt", "entries"],
  properties: {
    protocolVersion: { const: "til/1.0" },
    type: { const: "trace" },
    id: { type: "string" },
    createdAt: { type: "string", format: "date-time" },
    entries: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "timestamp", "message", "level"],
        properties: {
          id: { type: "string" },
          timestamp: { type: "string", format: "date-time" },
          message: { type: "string" },
          level: { enum: ["info", "warn", "error"] },
          data: { type: "object" },
        },
      },
    },
  },
} as const;

export type { Intent as IntentMessage, ActionPlan as ActionPlanMessage, Trace as TraceMessage };
