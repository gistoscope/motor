import type { ActionPlan, Intent, Trace } from "@til/core";

export interface EngineAdapter {
  readonly name: string;
  execute(intent: Intent, trace: Trace): ActionPlan;
}

export function createEchoAdapter(name: string): EngineAdapter {
  return {
    name,
    execute(intent, trace) {
      return {
        steps: [
          { kind: "record", detail: `${name}:${intent.name}` },
          { kind: "notify", detail: trace.events.at(-1)?.action ?? "boot" }
        ]
      };
    }
  };
}
