import type { MathEngineAction } from '../math/types';
import type { GVAction } from '../hover/state';

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

const PREVIEW_ATTR = 'tooltipPreview';
const PREVIEW_TITLE_ATTR = 'tooltipPreviewOriginalTitle';
const PREVIEW_ARIA_ATTR = 'tooltipPreviewOriginalAriaLabel';
const NULL_SENTINEL = '__MOTOR_PREVIEW_TOOLTIP_NONE__';

function storePreviewAttr(target: HTMLElement, key: typeof PREVIEW_TITLE_ATTR | typeof PREVIEW_ARIA_ATTR, value: string | null) {
  if (key in target.dataset) {
    return;
  }
  target.dataset[key] = value ?? NULL_SENTINEL;
}

function restorePreviewAttr(target: HTMLElement, key: typeof PREVIEW_TITLE_ATTR | typeof PREVIEW_ARIA_ATTR, apply: (value: string | null) => void) {
  if (!(key in target.dataset)) {
    apply(null);
    return;
  }
  const stored = target.dataset[key];
  delete target.dataset[key];
  if (stored === NULL_SENTINEL) {
    apply(null);
    return;
  }
  apply(stored ?? null);
}

function applyPreviewTooltip(target: HTMLElement, actions: GVAction[]): void {
  const normalized = actions
    .map((action) => (typeof action.label === 'string' && action.label.trim() ? action.label.trim() : action.id))
    .filter((label) => typeof label === 'string' && label.length > 0);

  if (normalized.length === 0) {
    delete target.dataset[PREVIEW_ATTR];
    restorePreviewAttr(target, PREVIEW_TITLE_ATTR, (value) => {
      if (value === null) {
        target.removeAttribute('title');
      } else {
        target.setAttribute('title', value);
      }
    });
    restorePreviewAttr(target, PREVIEW_ARIA_ATTR, (value) => {
      if (value === null) {
        target.removeAttribute('aria-label');
      } else {
        target.setAttribute('aria-label', value);
      }
    });
    return;
  }

  const previewLines = normalized.slice(0, 3);
  const remaining = normalized.length - previewLines.length;
  const tooltip = remaining > 0 ? `${previewLines.join('\n')}\n(+${remaining} more)` : previewLines.join('\n');

  storePreviewAttr(target, PREVIEW_TITLE_ATTR, target.getAttribute('title'));
  storePreviewAttr(target, PREVIEW_ARIA_ATTR, target.getAttribute('aria-label'));

  target.dataset[PREVIEW_ATTR] = tooltip;
  target.setAttribute('title', tooltip);
  target.setAttribute('aria-label', tooltip);
}

function applyRuleTooltipToElement(
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

export function applyRuleTooltip(
  target: HTMLElement,
  actionOrActions: Pick<MathEngineAction, 'id' | 'label'> | GVAction[],
): void {
  if (Array.isArray(actionOrActions)) {
    applyPreviewTooltip(target, actionOrActions);
    return;
  }
  applyRuleTooltipToElement(target, actionOrActions);
}

export function listKnownRuleIds(): string[] {
  return Array.from(RULE_HINTS.keys());
}
