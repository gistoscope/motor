import type { StageAst } from '../types';

type ListActions = (ast: StageAst, focus: readonly string[]) => string[];
type CanApply = (ast: StageAst, rule: string, focus: readonly string[]) => boolean;
type ApplyOne = (
  ast: StageAst,
  rule: string,
  focus: readonly string[],
) => { ok: true; ast: StageAst } | { ok: false; reason?: string };
type ApplyNextRule = (
  ast: StageAst,
  rule?: string,
) => { ast: StageAst; rule: string; rationale: string[] } | null | undefined;
type FormatStage2 = (ast: StageAst) => string;
type EvaluateExpression = (ast: StageAst) => { value: unknown } | { error: string };
type FormatRational = (value: unknown) => string;
type ParseStage2Expression = (source: string) => StageAst | { error: string };

export const listActions = null as unknown as ListActions;
export const canApply = null as unknown as CanApply;
export const applyOne = null as unknown as ApplyOne;
export const applyNextRule = null as unknown as ApplyNextRule;
export const formatStage2 = null as unknown as FormatStage2;
export const evaluateExpression = null as unknown as EvaluateExpression;
export const formatRational = null as unknown as FormatRational;
export const parseStage2Expression = null as unknown as ParseStage2Expression;
