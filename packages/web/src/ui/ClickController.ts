import type { AppliedPolicy, Expr, Path, PolicyBundle, PolicyProfile, StepPlan } from '@motor/types';
import { applyPolicy, resolveActions, type PolicyContext } from '@motor/tsa-policy';

export interface ClickContext {
  profile: PolicyProfile;
  bundles: Record<string, PolicyBundle>;
}

export const createPolicyContext = (ctx: ClickContext): PolicyContext => ({
  profile: ctx.profile,
  bundles: ctx.bundles
});

export const buildClickPlan = (path: Path, actions: readonly string[]): StepPlan => ({
  id: 'click-derived',
  title: 'Click expansion',
  steps: actions.map((action, idx) => ({
    id: `${action}-${idx}`,
    action,
    path
  }))
});

export const applyClick = (expr: Expr, path: Path, ctx: ClickContext): AppliedPolicy => {
  const policyCtx = createPolicyContext(ctx);
  const actions = resolveActions(policyCtx);
  const plan = buildClickPlan(path, actions);
  return applyPolicy(expr, plan, policyCtx, { stopOnFirstChange: true });
};
