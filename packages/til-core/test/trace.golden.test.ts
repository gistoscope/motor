import { describe, it, expect } from "vitest";
import { traceSchema } from "@til/core";
import fs from "node:fs";
import path from "node:path";

function validate(schema: any, payload: unknown): string[] {
  // same tiny validator approach
  const errs: string[] = [];
  const props = schema.properties ?? {};
  const req = schema.required ?? [];
  const isObj = (v: any) => v && typeof v === "object" && !Array.isArray(v);
  if (schema.const !== undefined && payload !== schema.const) errs.push(`const mismatch`);
  if (schema.type === "object" && isObj(payload)) {
    for (const k of req) if (!(k in payload)) errs.push(`${k} required`);
    for (const [k, v] of Object.entries(payload as any)) if (props[k]) errs.push(...validate(props[k], v));
  }
  if (schema.type === "array" && Array.isArray(payload) && schema.items) {
    (payload as any[]).forEach((x) => errs.push(...validate(schema.items, x)));
  }
  if (schema.format === "date-time" && typeof payload === "string" && Number.isNaN(Date.parse(payload))) errs.push(`bad date-time`);
  return errs;
}

function loadJson(p: string) {
  return JSON.parse(fs.readFileSync(path.resolve(p), "utf8"));
}

describe("golden traces", () => {
  it("validates flipSign.ok", () => {
    const t = loadJson("docs/traces/flipSign.ok.json");
    expect(validate(traceSchema, t)).toHaveLength(0);
  });
  it("validates unknown-command.err shape", () => {
    const t = loadJson("docs/traces/unknown-command.err.json");
    expect(validate(traceSchema, t)).toHaveLength(0);
  });
});
