import intentSchemaJson from "../../../schemas/intent.schema.json" assert { type: "json" };
import actionPlanSchemaJson from "../../../schemas/action-plan.schema.json" assert { type: "json" };
import traceSchemaJson from "../../../schemas/trace.schema.json" assert { type: "json" };
import errorSchemaJson from "../../../schemas/error.schema.json" assert { type: "json" };

export type JsonSchema = Record<string, unknown>;

export const intentSchema = intentSchemaJson as JsonSchema;
export const actionPlanSchema = actionPlanSchemaJson as JsonSchema;
export const traceSchema = traceSchemaJson as JsonSchema;
export const errorSchema = errorSchemaJson as JsonSchema;
