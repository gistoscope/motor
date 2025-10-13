import type { ActionPlan, Intent } from "@til/core";

export interface PolicyContext {
  readonly intent: Intent;
}

export interface PolicyDecision {
  readonly approved: boolean;
  readonly actionPlan?: ActionPlan;
  readonly reason?: string;
}

export type PolicyHandler = (context: PolicyContext) => PolicyDecision | Promise<PolicyDecision>;

export interface PolicyModule {
  readonly name: string;
  readonly handle: PolicyHandler;
}
