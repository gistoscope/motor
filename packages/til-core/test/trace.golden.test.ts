import { describe, expect, it } from "vitest";
import { traceSchema } from "../src";

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

describe("trace schema", () => {
  const validTrace = {
    sessionId: "trace-1",
    events: [
      {
        id: "evt-1",
        timestamp: new Date("2024-01-01T00:00:00.000Z").toISOString(),
        action: "boot",
        metadata: { actor: "system" }
      }
    ]
  };

  it("accepts a valid trace payload", () => {
    expect(validate(traceSchema, validTrace)).toEqual([]);
  });

  it("flags invalid timestamps", () => {
    const result = validate(traceSchema, {
      ...validTrace,
      events: [
        {
          ...validTrace.events[0],
          timestamp: "yesterday"
        }
      ]
    });

    expect(result).toEqual([
      "trace.events[0].timestamp should be a valid RFC3339 timestamp"
    ]);
  });

  it("requires id fields on each event", () => {
    const result = validate(traceSchema, {
      ...validTrace,
      events: [
        {
          timestamp: validTrace.events[0].timestamp,
          action: validTrace.events[0].action
        }
      ]
    });

    expect(result).toContain("trace.events[0].id is required");
  });
});
