import type { Intent, ActionPlan } from "@til/core";

const KNOWN_COMMANDS = [
  "til.commands.select",
  "til.commands.normalize",
  "til.commands.flipSign",
] as const;

export function decide(intent: Intent): { approved: boolean; reason?: string; actionPlan?: ActionPlan } {
  const goal = String(intent.goal ?? "").toLowerCase();
  const matched = KNOWN_COMMANDS.find((id) => goal.includes(id.split(".").pop()!.toLowerCase()));
  if (!matched) {
    return { approved: false, reason: "Unknown or unsupported command" };
  }
  const plan: ActionPlan = {
    protocolVersion: "til/1.0",
    type: "action_plan",
    id: `plan-${intent.id}`,
    intentId: intent.id,
    createdAt: new Date(0).toISOString(),
    steps: [{ id: "s1", title: `Execute ${matched}`, status: "pending", command: matched }],
  };
  return { approved: true, actionPlan: plan };
}
