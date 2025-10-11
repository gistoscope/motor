import { describe, expect, it } from "vitest";
import {
  protocolVersion,
  intentSchema,
  actionPlanSchema,
  traceSchema,
  errorSchema,
  normalizeErrorCode,
  createTilError
} from "../src/index.js";

type Schema = Record<string, unknown>;

type ValidationResult = {
  valid: boolean;
  errors: string[];
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function validate(schema: Schema, value: unknown): ValidationResult {
  const errors: string[] = [];

  const type = schema["type"];
  if (type === "object") {
    if (!isObject(value)) {
      errors.push(`Expected object but received ${typeof value}`);
      return { valid: errors.length === 0, errors };
    }

    const required = Array.isArray(schema["required"]) ? (schema["required"] as string[]) : [];
    for (const key of required) {
      if (!(key in value)) {
        errors.push(`Missing required property: ${key}`);
      }
    }

    const properties = isObject(schema["properties"]) ? (schema["properties"] as Record<string, Schema>) : {};
    for (const [key, propertySchema] of Object.entries(properties)) {
      if (key in value) {
        const result = validate(propertySchema, (value as Record<string, unknown>)[key]);
        errors.push(...result.errors.map((err) => `${key}: ${err}`));
      }
    }

    if (schema["additionalProperties"] === false) {
      for (const key of Object.keys(value)) {
        if (!(key in properties)) {
          errors.push(`Unexpected property: ${key}`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  if (type === "array") {
    if (!Array.isArray(value)) {
      errors.push(`Expected array but received ${typeof value}`);
      return { valid: errors.length === 0, errors };
    }

    const itemSchema = schema["items"] as Schema | undefined;
    if (itemSchema) {
      value.forEach((item, index) => {
        const result = validate(itemSchema, item);
        errors.push(...result.errors.map((err) => `[${index}]: ${err}`));
      });
    }

    return { valid: errors.length === 0, errors };
  }

  if (type === "string") {
    if (typeof value !== "string") {
      errors.push(`Expected string but received ${typeof value}`);
      return { valid: errors.length === 0, errors };
    }

    if (typeof schema["minLength"] === "number" && value.length < (schema["minLength"] as number)) {
      errors.push(`String shorter than minimum length ${(schema["minLength"] as number)}`);
    }

    if (typeof schema["pattern"] === "string") {
      const pattern = new RegExp(schema["pattern"] as string);
      if (!pattern.test(value)) {
        errors.push(`Value does not match pattern ${(schema["pattern"] as string)}`);
      }
    }

    if (schema["format"] === "date-time") {
      const parsed = Date.parse(value);
      if (Number.isNaN(parsed)) {
        errors.push(`Invalid date-time value: ${value}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  if (typeof schema["const"] !== "undefined") {
    if (value !== schema["const"]) {
      errors.push(`Expected const value ${schema["const"]} but received ${String(value)}`);
    }
    return { valid: errors.length === 0, errors };
  }

  // Primitive types fall back to basic equality checks when enums are present.
  if (Array.isArray(schema["enum"])) {
    if (!Array.isArray(schema["enum"])) {
      return { valid: true, errors };
    }
    if (!(schema["enum"] as unknown[]).includes(value)) {
      errors.push(`Value ${String(value)} not in enum ${JSON.stringify(schema["enum"])}`);
    }
    return { valid: errors.length === 0, errors };
  }

  return { valid: true, errors };
}

describe("TIL protocol", () => {
  it("declares the stable protocol version", () => {
    expect(protocolVersion).toBe("til/1.0");
  });

  it("validates the contract examples against schemas", () => {
    const intent = {
      protocolVersion: "til/1.0",
      id: "intent-1",
      createdAt: "2024-01-01T00:00:00.000Z",
      kind: "Select",
      actor: "user:123",
      payload: { targets: ["node-1"] }
    } satisfies Record<string, unknown>;

    const plan = {
      protocolVersion: "til/1.0",
      id: "plan-1",
      intentId: "intent-1",
      createdAt: "2024-01-01T00:00:01.000Z",
      steps: [
        { id: "step-1", title: "Highlight target", status: "ready" },
        { id: "step-2", title: "Focus panel", status: "pending" }
      ]
    } satisfies Record<string, unknown>;

    const trace = {
      protocolVersion: "til/1.0",
      id: "trace-1",
      planId: "plan-1",
      intentId: "intent-1",
      createdAt: "2024-01-01T00:00:02.000Z",
      events: [
        { id: "event-1", at: "2024-01-01T00:00:02.000Z", type: "highlight", status: "ok" }
      ]
    } satisfies Record<string, unknown>;

    const error = {
      protocolVersion: "til/1.0",
      id: "err-1",
      createdAt: "2024-01-01T00:00:03.000Z",
      code: "SELECT/INVALID_TARGET",
      message: "Target node cannot be selected.",
      hint: "Choose a visible node first.",
      nextSelections: [{ id: "root", title: "Root node" }]
    } satisfies Record<string, unknown>;

    expect(validate(intentSchema as Schema, intent)).toMatchObject({ valid: true });
    expect(validate(actionPlanSchema as Schema, plan)).toMatchObject({ valid: true });
    expect(validate(traceSchema as Schema, trace)).toMatchObject({ valid: true });
    expect(validate(errorSchema as Schema, error)).toMatchObject({ valid: true });
  });

  it("normalizes error codes deterministically", () => {
    expect(normalizeErrorCode("  custom.error / next ")).toBe("CUSTOM_ERROR/NEXT");
    expect(normalizeErrorCode("  ")).toBe("UNKNOWN");

    const tilError = createTilError({
      code: "fsm.invalid_transition",
      message: "Transition failed"
    });

    expect(tilError.code).toBe("FSM_INVALID_TRANSITION");
    expect(tilError.createdAt).toBe("1970-01-01T00:00:00.000Z");
    expect(tilError.id).toBe("FSM_INVALID_TRANSITION");
  });
});
