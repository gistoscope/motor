export interface MathDiffPayload {
  added: string[];
  removed: string[];
  changed: string[];
}

const DIFF_CLASSES = ['motor-diff-add', 'motor-diff-del', 'motor-diff-chg'] as const;

function escapeAttribute(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function normalizeIds(ids: Iterable<string>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of ids) {
    const trimmed = id.trim();
    if (!trimmed) {
      continue;
    }
    if (!seen.has(trimmed)) {
      seen.add(trimmed);
      result.push(trimmed);
    }
  }
  return result;
}

function addClass(host: HTMLElement, ids: Iterable<string>, className: string): void {
  const normalized = normalizeIds(ids);
  if (normalized.length === 0) {
    return;
  }
  for (const id of normalized) {
    const selector = `[data-token-id="${escapeAttribute(id)}"]`;
    host.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      el.classList.add(className);
    });
  }
}

export function applyMathDiff(host: HTMLElement, diff: MathDiffPayload): void {
  const selector = DIFF_CLASSES.map((className) => `.${className}`).join(', ');
  if (selector) {
    host.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      el.classList.remove(...DIFF_CLASSES);
      if (el.className.trim().length === 0) {
        el.removeAttribute('class');
      }
    });
  }

  const { added, removed, changed } = diff;
  addClass(host, added ?? [], 'motor-diff-add');
  addClass(host, removed ?? [], 'motor-diff-del');
  addClass(host, changed ?? [], 'motor-diff-chg');
}
