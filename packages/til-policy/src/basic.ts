import type { ActionPlan, Intent, Trace } from "@til/core";

export interface PolicyContext {
  readonly trace: Trace;
  readonly now: string;
}

function buildRecordDetail(intent: Intent, context: PolicyContext): string {
  const summary = intent.payload?.summary ?? intent.name;
  return `${context.now}:${summary}`;
}

export function planFromIntent(intent: Intent, context: PolicyContext): ActionPlan {
  const steps: ActionPlan["steps"] = [
    { kind: "record", detail: buildRecordDetail(intent, context) }
  ];

  const recent = context.trace.events.at(-1);
  if (recent) {
    steps.push({ kind: "notify", detail: recent.action });
  } else {
    steps.push({ kind: "noop", detail: "no-events" });
  }

  return { steps };
}

export function planWithFallback(intent: Intent, context: PolicyContext): ActionPlan {
  if (!intent.payload || Object.keys(intent.payload).length === 0) {
    const fallback: ActionPlan["steps"] = [
      { kind: "noop", detail: `${context.now}:idle` }
    ];
    return { steps: fallback };
  }

  return planFromIntent(intent, context);
}
