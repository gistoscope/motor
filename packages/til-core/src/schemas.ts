import intentSchemaJson from "../../../schemas/intent.schema.json" assert { type: "json" };
import actionPlanSchemaJson from "../../../schemas/action-plan.schema.json" assert { type: "json" };
import traceSchemaJson from "../../../schemas/trace.schema.json" assert { type: "json" };
import errorSchemaJson from "../../../schemas/error.schema.json" assert { type: "json" };

export const intentSchema = intentSchemaJson;
export const actionPlanSchema = actionPlanSchemaJson;
export const traceSchema = traceSchemaJson;
export const tilErrorSchema = errorSchemaJson;
