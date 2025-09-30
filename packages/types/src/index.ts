export type Rational = { n: bigint; d: bigint };

export type RatNode = { type: 'rat'; value: Rational };
export type AddNode = { type: 'add'; args: Expr[] };
export type MulNode = { type: 'mul'; args: Expr[] };
export type SubNode = { type: 'sub'; left: Expr; right: Expr };
export type DivNode = { type: 'div'; left: Expr; right: Expr };
export type PowNode = { type: 'pow'; left: Expr; right: Expr };
export type SqrtNode = { type: 'sqrt'; arg: Expr };
export type CbrtNode = { type: 'cbrt'; arg: Expr };

export type Expr =
  | RatNode
  | AddNode
  | MulNode
  | SubNode
  | DivNode
  | PowNode
  | SqrtNode
  | CbrtNode;

export type ExprJSON =
  | { type: 'rat'; n: string; d: string }
  | { type: 'add'; args: ExprJSON[] }
  | { type: 'mul'; args: ExprJSON[] }
  | { type: 'sub' | 'div' | 'pow'; left: ExprJSON; right: ExprJSON }
  | { type: 'sqrt' | 'cbrt'; arg: ExprJSON };

export type PathSegment = number | 'left' | 'right' | 'arg';
export type Path = readonly PathSegment[];

export interface StepResult {
  changed: boolean;
  expr: Expr;
  path: Path;
  description?: string;
  meta?: Record<string, unknown>;
}

export type StepFn = (expr: Expr, path: Path) => StepResult | null;

export interface StepPlanEntry {
  id: string;
  action: string;
  description?: string;
  path?: Path;
}

export interface StepPlan {
  id: string;
  title: string;
  steps: readonly StepPlanEntry[];
}

export interface PolicyBundle {
  id: string;
  label: string;
  steps: readonly string[];
}

export interface PolicyProfile {
  id: string;
  label: string;
  bundles: readonly string[];
  atoms?: readonly string[];
}

export interface AppliedStep {
  action: string;
  before: Expr;
  after: Expr;
  result: StepResult;
}

export interface AppliedPolicy {
  final: Expr;
  steps: readonly AppliedStep[];
}

export type ActionRegistry = Record<string, StepFn>;
