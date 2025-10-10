export const protocolVersion = "til/1.0" as const;

export type ProtocolVersion = typeof protocolVersion;

export type ProtocolMessageType = "intent" | "action_plan" | "trace" | "error";

export interface ProtocolEnvelope<TType extends ProtocolMessageType> {
  readonly protocolVersion: ProtocolVersion;
  readonly type: TType;
  readonly id: string;
  readonly createdAt: string;
}

export interface ActorRef {
  readonly id: string;
  readonly role?: string;
  readonly name?: string;
}

export interface SelectionOption {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
}

export interface Intent extends ProtocolEnvelope<"intent"> {
  readonly goal: string;
  readonly actor?: ActorRef;
  readonly context?: Record<string, unknown>;
  readonly metadata?: Record<string, unknown>;
}

export type ActionPlanStepStatus = "pending" | "in_progress" | "done";

export interface ActionPlanStep {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly status?: ActionPlanStepStatus;
  readonly command?: string;
}

export interface ActionPlan extends ProtocolEnvelope<"action_plan"> {
  readonly intentId: string;
  readonly steps: readonly ActionPlanStep[];
}

export type TraceLevel = "info" | "warn" | "error";

export interface TraceEntry {
  readonly id: string;
  readonly timestamp: string;
  readonly message: string;
  readonly level: TraceLevel;
  readonly data?: Record<string, unknown>;
}

export interface Trace extends ProtocolEnvelope<"trace"> {
  readonly entries: readonly TraceEntry[];
}

export type NormalizedErrorCode = string;

export interface TilError extends ProtocolEnvelope<"error"> {
  readonly code: NormalizedErrorCode;
  readonly message: string;
  readonly hint?: string;
  readonly nextSelections?: readonly SelectionOption[];
}

export type TilMessage = Intent | ActionPlan | Trace | TilError;
