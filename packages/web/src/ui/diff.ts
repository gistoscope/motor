import { addClassByIds, clearClassEverywhere } from '../dom/anchor-helpers.js';

export interface MathDiffPayload {
  added: string[];
  removed: string[];
  changed: string[];
}

const DIFF_CLASSES = ['motor-diff-add', 'motor-diff-del', 'motor-diff-chg'] as const;

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
  addClassByIds(host, normalized, className);
}

export function applyMathDiff(host: HTMLElement, diff: MathDiffPayload): void {
  for (const className of DIFF_CLASSES) {
    clearClassEverywhere(host, className);
  }

  const { added, removed, changed } = diff;
  addClass(host, added ?? [], 'motor-diff-add');
  addClass(host, removed ?? [], 'motor-diff-del');
  addClass(host, changed ?? [], 'motor-diff-chg');
}
