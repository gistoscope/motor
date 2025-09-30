import type { Expr, Path, StepFn, StepResult } from '@motor/types';

export const applyStep = (expr: Expr, path: Path, action: StepFn): StepResult | null => {
  const result = action(expr, path);
  if (!result || !result.changed) {
    return null;
  }
  return result;
};
