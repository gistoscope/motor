import { describe, it, expect } from "vitest";
import { intentSchema, actionPlanSchema } from "@til/core";
import { decide } from "../src/basic";

function validate(schema: any, payload: unknown): string[] {
  // tiny inline validator (same style as in core tests)
  const errs: string[] = [];
  const t = schema.type;
  const props = schema.properties ?? {};
  const req = schema.required ?? [];
  const isObj = (v: any) => v && typeof v === "object" && !Array.isArray(v);
  if (t === "object" && isObj(payload)) {
    for (const k of req) if (!(k in payload)) errs.push(`$.${k} required`);
    for (const [k, v] of Object.entries(payload as any)) {
      if (props[k]) errs.push(...validate(props[k], v));
    }
  }
  if (schema.const !== undefined && payload !== schema.const) errs.push(`$ const mismatch`);
  if (t === "string" && typeof payload !== "string") errs.push(`$ type string expected`);
  if (schema.format === "date-time" && typeof payload === "string" && Number.isNaN(Date.parse(payload))) errs.push(`$ bad date-time`);
  if (schema.type === "array" && Array.isArray(payload) && schema.items) {
    (payload as any[]).forEach((x, i) => errs.push(...validate(schema.items, x)));
  }
  return errs;
}

describe("policy.basic", () => {
  it("rejects unknown goals", () => {
    const { approved, reason, actionPlan } = decide({
      protocolVersion: "til/1.0",
      type: "intent",
      id: "i-1",
      createdAt: new Date(0).toISOString(),
      goal: "do something weird",
    });
    expect(approved).toBe(false);
    expect(reason).toBeTypeOf("string");
    expect(actionPlan).toBeUndefined();
  });

  it("approves known command and returns a schema-valid plan", () => {
    const intent = {
      protocolVersion: "til/1.0",
      type: "intent",
      id: "i-2",
      createdAt: new Date(0).toISOString(),
      goal: "please flipSign",
    };
    const d = decide(intent);
    expect(d.approved).toBe(true);
    expect(validate(intentSchema, intent)).toHaveLength(0);
    expect(validate(actionPlanSchema, d.actionPlan)).toHaveLength(0);
  });
});
