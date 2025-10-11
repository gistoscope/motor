import type { ActionPlan, Intent } from "@til/core";

export interface PolicyContext {
  intent: Intent;
}

export type PolicyDecision = {
  approved: boolean;
  actionPlan?: ActionPlan;
  reason?: string;
};

export type PolicyHandler = (ctx: PolicyContext) => PolicyDecision | Promise<PolicyDecision>;

export interface PolicyModule {
  name: string;
  handle: PolicyHandler;
}
