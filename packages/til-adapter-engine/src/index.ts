import type { ActionPlan, Intent, Trace } from "@til/core";

export interface EngineAdapterMetadata {
  readonly name: string;
  readonly version: string;
  readonly capabilities?: readonly string[];
}

export interface EngineAdapter {
  readonly metadata: EngineAdapterMetadata;
  plan(intent: Intent): Promise<ActionPlan> | ActionPlan;
  observe?(trace: Trace): Promise<void> | void;
}
