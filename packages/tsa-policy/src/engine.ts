import { applyStep, route } from '@motor/tsa';
import type { AppliedPolicy, Expr, Path, PolicyBundle, PolicyProfile, StepPlan } from '@motor/types';

export interface PolicyContext {
  profile: PolicyProfile;
  bundles: Record<string, PolicyBundle>;
}

const defaultPath: Path = [];

export const resolveActions = (ctx: PolicyContext): readonly string[] => {
  const bundleSteps = ctx.profile.bundles.flatMap(id => ctx.bundles[id]?.steps ?? []);
  const atoms = ctx.profile.atoms ?? [];
  return Array.from(new Set([...bundleSteps, ...atoms]));
};

export interface ApplyPolicyOptions {
  stopOnFirstChange?: boolean;
}

export const applyPolicy = (expr: Expr, plan: StepPlan, ctx: PolicyContext, options: ApplyPolicyOptions = {}): AppliedPolicy => {
  const allowed = new Set(resolveActions(ctx));
  let current = expr;
  const history = [] as AppliedPolicy['steps'];
  for (const step of plan.steps) {
    if (!allowed.has(step.action)) continue;
    const fn = route(step.action);
    if (!fn) continue;
    const targetPath = step.path ?? defaultPath;
    const result = applyStep(current, targetPath, fn);
    if (!result) continue;
    history.push({ action: step.action, before: current, after: result.expr, result });
    current = result.expr;
    if (options.stopOnFirstChange) {
      break;
    }
  }
  return { final: current, steps: history };
};
