import type { EngineAdapter } from "@til/adapter-engine";
import type { Intent, Trace } from "@til/core";

export interface UiAdapter {
  readonly engine: EngineAdapter;
  render(intent: Intent, trace: Trace): string;
}

export function createUiAdapter(engine: EngineAdapter): UiAdapter {
  return {
    engine,
    render(intent, trace) {
      const plan = engine.execute(intent, trace);
      const steps = plan.steps.map((step) => `${step.kind}:${step.detail}`).join("\n");
      return [
        `intent=${intent.name}`,
        `events=${trace.events.length}`,
        steps
      ].join("\n");
    }
  };
}
