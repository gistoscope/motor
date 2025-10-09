/* @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { wireExecuteShortcuts } from '../shortcuts';

describe('owner hit-area', () => {
  it('clicking inside owner area selects owner', async () => {
    vi.useFakeTimers();
    const root = document.createElement('div');

    const owner = document.createElement('span');
    owner.setAttribute('data-ast-id', 'op.root');

    const inner = document.createElement('span');
    inner.setAttribute('data-ast-id', 'op.root.left.inner');

    owner.append(inner);
    root.append(owner);

    const ast = { owner: { 'op.root.left.inner': 'op.root' } };

    let sel: string[] = [];
    const un = wireExecuteShortcuts(root, {
      getAst: () => ast as any,
      getSelection: () => sel,
      setSelection(ids) { sel = ids; },
      exec() {},
    });

    inner.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(221);

    expect(sel).toEqual(['op.root']);
    un?.();
    vi.useRealTimers();
  });
});
