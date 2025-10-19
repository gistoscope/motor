import type { GraphJSON, GraphValidationResult } from '../types';

type ValidateGraphJSON = (value: unknown) => GraphValidationResult;
type FromJson = (graph: GraphJSON) => unknown;
type ToDot = (graph: unknown) => string;
type Inspect = (graph: unknown) => string;

export const validateGraphJSON = null as unknown as ValidateGraphJSON;
export const fromJSON = null as unknown as FromJson;
export const toDOT = null as unknown as ToDot;
export const inspect = null as unknown as Inspect;
