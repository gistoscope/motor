import { describe, expect, it } from "vitest";

import {
  actionPlanSchema,
  createTilError,
  intentSchema,
  normalizeErrorCode,
  protocolVersion,
  tilErrorSchema,
  traceSchema,
} from "../src";

type JsonSchema = {
  readonly const?: unknown;
  readonly type?: string | readonly string[];
  readonly properties?: Record<string, JsonSchema>;
  readonly required?: readonly string[];
  readonly additionalProperties?: boolean;
  readonly items?: JsonSchema;
  readonly minItems?: number;
  readonly minLength?: number;
  readonly enum?: readonly unknown[];
  readonly pattern?: string;
  readonly format?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validate(schema: JsonSchema, payload: unknown, path = "$" ): string[] {
  const errors: string[] = [];
  const expectedTypes = schema.type
    ? Array.isArray(schema.type)
      ? schema.type
      : [schema.type]
    : undefined;

  if (schema.const !== undefined && payload !== schema.const) {
    errors.push(`${path} should equal ${JSON.stringify(schema.const)}`);
    return errors;
  }

  if (expectedTypes) {
    const matches = expectedTypes.some((expectedType) => {
      switch (expectedType) {
        case "object":
          return isRecord(payload);
        case "array":
          return Array.isArray(payload);
        case "string":
          return typeof payload === "string";
        default:
          return typeof payload === expectedType;
      }
    });

    if (!matches) {
      errors.push(`${path} should be of type ${expectedTypes.join(" | ")}`);
      return errors;
    }
  }

  if (schema.type === "object" && isRecord(payload)) {
    const properties = schema.properties ?? {};
    const required = schema.required ?? [];

    for (const field of required) {
      if (!(field in payload)) {
        errors.push(`${path}.${field} is required`);
      }
    }

    for (const [key, value] of Object.entries(payload)) {
      if (!(key in properties)) {
        if (schema.additionalProperties === false) {
          errors.push(`${path}.${key} is not allowed`);
        }
        continue;
      }

      errors.push(...validate(properties[key]!, value, `${path}.${key}`));
    }
  }

  if (schema.type === "array" && Array.isArray(payload)) {
    if (schema.minItems !== undefined && payload.length < schema.minItems) {
      errors.push(`${path} should contain at least ${schema.minItems} items`);
    }

    if (schema.items) {
      payload.forEach((item, index) => {
        errors.push(...validate(schema.items!, item, `${path}[${index}]`));
      });
    }
  }

  if (schema.type === "string" && typeof payload === "string") {
    if (schema.minLength !== undefined && payload.length < schema.minLength) {
      errors.push(`${path} should have length >= ${schema.minLength}`);
    }

    if (schema.enum && !schema.enum.includes(payload)) {
      errors.push(`${path} should be one of ${schema.enum.join(", ")}`);
    }

    if (schema.pattern && !(new RegExp(schema.pattern, "u")).test(payload)) {
      errors.push(`${path} should match pattern ${schema.pattern}`);
    }

    if (schema.format === "date-time" && Number.isNaN(Date.parse(payload))) {
      errors.push(`${path} should match date-time format`);
    }
  }

  return errors;
}

function assertSchema(schema: unknown, payload: unknown): void {
  const errors = validate(schema as JsonSchema, payload);
  expect(errors, errors.join("; ")).toHaveLength(0);
}

describe("protocol contract", () => {
  it("locks the protocol version", () => {
    expect(protocolVersion).toBe("til/1.0");
  });

  it("validates the intent schema", () => {
    const sampleIntent = {
      protocolVersion,
      type: "intent",
      id: "intent-123",
      createdAt: "2024-01-01T00:00:00.000Z",
      goal: "Classify the user request",
      actor: {
        id: "user-1",
        role: "user",
      },
      context: {
        locale: "en-US",
      },
    } satisfies Record<string, unknown>;

    assertSchema(intentSchema, sampleIntent);
  });

  it("validates the action plan schema", () => {
    const samplePlan = {
      protocolVersion,
      type: "action_plan",
      id: "plan-42",
      intentId: "intent-123",
      createdAt: "2024-01-01T00:00:05.000Z",
      steps: [
        {
          id: "step-1",
          title: "Select command",
          status: "pending",
        },
      ],
    } satisfies Record<string, unknown>;

    assertSchema(actionPlanSchema, samplePlan);
  });

  it("validates the trace schema", () => {
    const sampleTrace = {
      protocolVersion,
      type: "trace",
      id: "trace-1",
      createdAt: "2024-01-01T00:00:10.000Z",
      entries: [
        {
          id: "event-1",
          timestamp: "2024-01-01T00:00:10.000Z",
          message: "Received intent",
          level: "info",
        },
      ],
    } satisfies Record<string, unknown>;

    assertSchema(traceSchema, sampleTrace);
  });

  it("validates the error schema", () => {
    const error = createTilError({
      code: "fsm.invalid/next",
      message: "No transition for NEXT",
      hint: "Check the configured transitions.",
      nextSelections: [
        { id: "retry", title: "Retry transition" },
      ],
    });

    assertSchema(tilErrorSchema, error);
  });

  it("normalises error codes deterministically", () => {
    const normalized = normalizeErrorCode("  custom.error / next-step  ");
    expect(normalized).toBe("CUSTOM_ERROR/NEXT_STEP");
  });
});
