import type { MathEngineAction } from '../math/types';

export interface RuleHint {
  label: string;
  shortDescription?: string;
}

const BASE_RULE_HINTS: Record<string, RuleHint> = {
  simplify: {
    label: 'Simplify',
    shortDescription: 'Reduce the expression to an equivalent but simpler form.',
  },
  factor: {
    label: 'Factor',
    shortDescription: 'Rewrite the expression as a product of simpler factors.',
  },
  expand: {
    label: 'Expand',
    shortDescription: 'Multiply out factors and collect like terms.',
  },
  combineLiketerms: {
    label: 'Combine like terms',
    shortDescription: 'Group and merge terms with the same variables.',
  },
  substitute: {
    label: 'Substitute',
    shortDescription: 'Replace a variable with an equivalent expression or value.',
  },
  distribute: {
    label: 'Distribute',
    shortDescription: 'Apply the distributive property across addition or subtraction.',
  },
  cancel: {
    label: 'Cancel',
    shortDescription: 'Eliminate matching factors that appear in numerator and denominator.',
  },
  rationalize: {
    label: 'Rationalize',
    shortDescription: 'Remove radicals from the denominator of a fraction.',
  },
  undo: {
    label: 'Undo',
    shortDescription: 'Revert the most recent action.',
  },
  redo: {
    label: 'Redo',
    shortDescription: 'Reapply the most recently undone action.',
  },
  hint: {
    label: 'Hint',
    shortDescription: 'Highlight a suggested next step.',
  },
};

function normalizeRuleId(ruleId: string): string {
  return ruleId.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

const RULE_HINTS = new Map<string, RuleHint>();
for (const [key, value] of Object.entries(BASE_RULE_HINTS)) {
  RULE_HINTS.set(normalizeRuleId(key), value);
}

export function getRuleHint(ruleId: string): RuleHint | null {
  if (typeof ruleId !== 'string' || ruleId.trim() === '') {
    return null;
  }
  const normalized = normalizeRuleId(ruleId);
  if (RULE_HINTS.has(normalized)) {
    return RULE_HINTS.get(normalized) ?? null;
  }
  return null;
}

function formatRuleTooltipContent(ruleId: string, fallbackLabel: string | null): string | null {
  const hint = getRuleHint(ruleId);
  if (!hint) {
    return fallbackLabel;
  }
  const pieces = [hint.label.trim()];
  if (hint.shortDescription) {
    const description = hint.shortDescription.trim();
    if (description.length > 0) {
      pieces.push(description);
    }
  }
  if (pieces.length === 0) {
    return fallbackLabel;
  }
  if (pieces.length === 1) {
    return pieces[0];
  }
  return `${pieces[0]} — ${pieces[1]}`;
}

export function applyRuleTooltip(
  target: HTMLElement,
  action: Pick<MathEngineAction, 'id' | 'label'>,
): void {
  const fallback = typeof action.label === 'string' ? action.label : action.id;
  const tooltip = formatRuleTooltipContent(action.id, fallback);
  if (!tooltip || tooltip.trim() === '') {
    target.removeAttribute('title');
    target.removeAttribute('aria-label');
    delete target.dataset.tooltipRuleId;
    delete target.dataset.tooltipLabel;
    delete target.dataset.tooltipDescription;
    return;
  }
  target.setAttribute('title', tooltip);
  target.setAttribute('aria-label', tooltip);
  target.dataset.tooltipRuleId = action.id;
  const hint = getRuleHint(action.id);
  if (hint) {
    target.dataset.tooltipLabel = hint.label;
    if (hint.shortDescription && hint.shortDescription.trim() !== '') {
      target.dataset.tooltipDescription = hint.shortDescription;
    } else {
      delete target.dataset.tooltipDescription;
    }
  } else {
    target.dataset.tooltipLabel = fallback;
    delete target.dataset.tooltipDescription;
  }
}

export function listKnownRuleIds(): string[] {
  return Array.from(RULE_HINTS.keys());
}
