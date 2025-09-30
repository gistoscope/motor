import { availableActions } from '@motor/tsa';
import type { PolicyContext } from './engine.js';

export interface ValidationIssue {
  level: 'error' | 'warning';
  message: string;
}

export const validatePolicy = (ctx: PolicyContext): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const knownActions = new Set(availableActions());
  for (const bundleId of ctx.profile.bundles) {
    if (!ctx.bundles[bundleId]) {
      issues.push({ level: 'error', message: `Missing bundle '${bundleId}' referenced by profile ${ctx.profile.id}` });
    }
  }
  const actions = ctx.profile.atoms ?? [];
  for (const action of actions) {
    if (!knownActions.has(action)) {
      issues.push({ level: 'error', message: `Unknown action '${action}' in profile ${ctx.profile.id}` });
    }
  }
  for (const bundle of Object.values(ctx.bundles)) {
    for (const action of bundle.steps) {
      if (!knownActions.has(action)) {
        issues.push({ level: 'warning', message: `Bundle '${bundle.id}' references unknown action '${action}'` });
      }
    }
  }
  return issues;
};
