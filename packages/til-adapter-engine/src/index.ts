import type { ActionPlan, Intent, Trace } from "@til/core";

export type Capability = { name: string; version?: string };

export interface EngineCtx {
  [k: string]: unknown;
}

export interface EngineAdapter {
  capabilities(): Capability[];
  plan(intent: Intent, ctx: EngineCtx): Promise<ActionPlan> | ActionPlan;
  apply(plan: ActionPlan): Promise<Trace> | Trace;
}
