/* @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { wireExecuteShortcuts } from '../shortcuts';

describe('clicking a paren selects the pair', () => {
  it('selects both parens when clicking either', async () => {
    vi.useFakeTimers();
    const root = document.createElement('div');
    const open = document.createElement('span');
    open.setAttribute('data-ast-id', 'p.open');
    const close = document.createElement('span');
    close.setAttribute('data-ast-id', 'p.close');
    root.append(open, close);

    const ast = {
      tokens: { 'p.open': { text: '(' }, 'p.close': { text: ')' } },
      pairs: { 'p.open': ['p.open', 'p.close'], 'p.close': ['p.open', 'p.close'] },
    };

    let sel: string[] = [];
    const un = wireExecuteShortcuts(root, {
      getAst: () => ast,
      getSelection: () => sel,
      setSelection(ids) { sel = ids; },
      exec() {},
    });

    open.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(221);
    expect(sel).toEqual(['p.open', 'p.close']);

    // сбросим выбор вручную, чтобы проверить второй клик по паре
    sel = [];

    close.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(221);
    expect(sel).toEqual(['p.open', 'p.close']);

    un?.();
    vi.useRealTimers();
  });
});
