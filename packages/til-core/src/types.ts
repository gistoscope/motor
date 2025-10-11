export const protocolVersion = "til/1.0" as const;

export type ProtocolVersion = typeof protocolVersion;
export type IsoDateTimeString = string;

export interface Intent {
  protocolVersion: ProtocolVersion;
  id: string;
  createdAt: IsoDateTimeString;
  kind: string;
  actor?: string;
  payload?: Record<string, unknown>;
}

export type PlanStepStatus = "pending" | "ready" | "complete";

export interface PlanStep {
  id: string;
  title: string;
  description?: string;
  status: PlanStepStatus;
}

export interface ActionPlan {
  protocolVersion: ProtocolVersion;
  id: string;
  intentId: string;
  createdAt: IsoDateTimeString;
  steps: PlanStep[];
}

export type TraceEventStatus = "ok" | "error";

export interface TraceEvent {
  id: string;
  at: IsoDateTimeString;
  type: string;
  status: TraceEventStatus;
  data?: Record<string, unknown>;
}

export interface Trace {
  protocolVersion: ProtocolVersion;
  id: string;
  planId: string;
  intentId: string;
  createdAt: IsoDateTimeString;
  events: TraceEvent[];
}

export interface NextSelection {
  id: string;
  title: string;
  description?: string;
}

export interface TilError {
  protocolVersion: ProtocolVersion;
  id: string;
  createdAt: IsoDateTimeString;
  code: string;
  message: string;
  hint?: string;
  nextSelections?: NextSelection[];
}

export type ProtocolEnvelope = Intent | ActionPlan | Trace | TilError;
