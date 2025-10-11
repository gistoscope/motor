import { describe, expect, it } from "vitest";
import { traceSchema } from "@til/core";
import { planFromIntent, planWithFallback, type PolicyContext } from "../src";

type JsonSchema = {
  readonly type?: string;
  readonly required?: string[];
  readonly properties?: Record<string, JsonSchema>;
  readonly items?: JsonSchema;
  readonly minItems?: number;
  readonly minLength?: number;
  readonly format?: string;
};

function validate(schema: any, payload: any): string[] {
  const errors: string[] = [];

  const visit = (currentSchema: JsonSchema, value: any, path: string): void => {
    if (!currentSchema) {
      return;
    }

    switch (currentSchema.type) {
      case "object": {
        if (typeof value !== "object" || value === null || Array.isArray(value)) {
          errors.push(`${path} should be an object`);
          return;
        }

        const required = currentSchema.required ?? [];
        for (const key of required) {
          if (!(key in (value as Record<string, unknown>))) {
            errors.push(`${path}.${key} is required`);
          }
        }

        const properties = currentSchema.properties ?? {};
        for (const [key, propertySchema] of Object.entries(properties)) {
          const nextValue = (value as Record<string, unknown>)[key];
          if (nextValue === undefined) {
            continue;
          }
          visit(propertySchema, nextValue, `${path}.${key}`);
        }
        break;
      }
      case "array": {
        if (!Array.isArray(value)) {
          errors.push(`${path} should be an array`);
          return;
        }

        if (typeof currentSchema.minItems === "number" && value.length < currentSchema.minItems) {
          errors.push(`${path} should contain at least ${currentSchema.minItems} items`);
        }

        value.forEach((item, index) => {
          visit(currentSchema.items ?? {}, item, `${path}[${index}]`);
        });
        break;
      }
      case "string": {
        if (typeof value !== "string") {
          errors.push(`${path} should be a string`);
          return;
        }

        if (typeof currentSchema.minLength === "number" && value.length < currentSchema.minLength) {
          errors.push(`${path} should contain at least ${currentSchema.minLength} characters`);
        }

        if (currentSchema.format === "date-time" && typeof value === "string" && Number.isNaN(Date.parse(value))) {
          errors.push(`${path} should be a valid RFC3339 timestamp`);
        }
        break;
      }
      default:
        break;
    }
  };

  visit(schema, payload, "trace");
  return errors;
}

describe("basic policy", () => {
  const trace = {
    sessionId: "trace-policy",
    events: [
      {
        id: "evt-policy-1",
        timestamp: new Date("2024-03-03T08:00:00.000Z").toISOString(),
        action: "resume"
      }
    ]
  };

  const context: PolicyContext = {
    trace,
    now: new Date("2024-03-03T08:01:00.000Z").toISOString()
  };

  it("builds a record and notify plan from an intent", () => {
    const intent = {
      name: "capture",
      issuedAt: context.now,
      payload: { summary: "capture-trace" }
    };

    expect(validate(traceSchema, context.trace)).toEqual([]);
    const plan = planFromIntent(intent, context);

    expect(plan.steps).toHaveLength(2);
    expect(plan.steps[0]).toMatchObject({ kind: "record", detail: `${context.now}:capture-trace` });
    expect(plan.steps[1]).toMatchObject({ kind: "notify", detail: "resume" });
  });

  it("falls back to noop when payload is empty", () => {
    const intent = {
      name: "idle",
      issuedAt: context.now,
      payload: {}
    };

    const plan = planWithFallback(intent, context);
    expect(plan.steps).toEqual([{ kind: "noop", detail: `${context.now}:idle` }]);
  });

  it("surfaces schema errors for invalid traces", () => {
    const brokenTrace = {
      ...trace,
      events: [
        {
          id: "broken",
          timestamp: "not-a-date",
          action: "resume"
        }
      ]
    };

    expect(validate(traceSchema, brokenTrace)).toEqual([
      "trace.events[0].timestamp should be a valid RFC3339 timestamp"
    ]);
  });
});
