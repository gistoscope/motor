import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Window } from 'happy-dom';

import { applyMathDiff } from '../../web/src/ui/diff';

describe('math diff overlay', () => {
  let domWindow: Window;

  beforeEach(() => {
    domWindow = new Window();
    globalThis.window = domWindow as unknown as typeof globalThis.window;
    globalThis.document = domWindow.document as unknown as typeof globalThis.document;
    globalThis.HTMLElement = domWindow.HTMLElement as unknown as typeof globalThis.HTMLElement;
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { document?: unknown }).document;
    delete (globalThis as { HTMLElement?: unknown }).HTMLElement;
  });

  it('applies and clears diff classes deterministically', () => {
    const host = document.createElement('div');
    host.innerHTML = [
      '<span data-token-id="keep" class="math-token">x</span>',
      '<span data-token-id="add">+</span>',
      '<span data-token-id="remove">y</span>',
      '<span data-token-id="change">z</span>',
      '<span data-token-id="duplicate">1</span>',
      '<span data-token-id="duplicate">2</span>',
    ].join(' ');

    const keep = host.querySelector('[data-token-id="keep"]') as HTMLElement;
    const add = host.querySelector('[data-token-id="add"]') as HTMLElement;
    const remove = host.querySelector('[data-token-id="remove"]') as HTMLElement;
    const change = host.querySelector('[data-token-id="change"]') as HTMLElement;
    const duplicates = host.querySelectorAll<HTMLElement>('[data-token-id="duplicate"]');

    applyMathDiff(host, {
      added: ['add', 'duplicate', 'duplicate'],
      removed: ['remove'],
      changed: ['change'],
    });

    expect(add.classList.contains('motor-diff-add')).toBe(true);
    expect(change.classList.contains('motor-diff-chg')).toBe(true);
    expect(remove.classList.contains('motor-diff-del')).toBe(true);
    expect(keep.classList.contains('motor-diff-add')).toBe(false);
    duplicates.forEach((element) => {
      expect(element.classList.contains('motor-diff-add')).toBe(true);
    });

    applyMathDiff(host, {
      added: ['keep'],
      removed: [],
      changed: ['duplicate'],
    });

    expect(add.classList.contains('motor-diff-add')).toBe(false);
    expect(change.classList.contains('motor-diff-chg')).toBe(false);
    expect(remove.classList.contains('motor-diff-del')).toBe(false);
    expect(keep.classList.contains('motor-diff-add')).toBe(true);
    duplicates.forEach((element) => {
      expect(element.classList.contains('motor-diff-chg')).toBe(true);
      expect(element.classList.contains('motor-diff-add')).toBe(false);
    });

    applyMathDiff(host, {
      added: [],
      removed: [],
      changed: [],
    });

    const diffElements = host.querySelectorAll('.motor-diff-add, .motor-diff-del, .motor-diff-chg');
    expect(diffElements.length).toBe(0);
  });
});
