import { describe, it, expect, vi } from 'vitest';
import { wireExecuteShortcuts } from '../shortcuts';
import type { NodeId } from '../opTokens';

describe('wireExecuteShortcuts owner toggle', () => {
  it('handles owner selection, toggling, and execution', async () => {
    const root = document.createElement('div');
    const token = document.createElement('span');
    token.setAttribute('data-ast-id', 'op');
    root.append(token);

    const ast = {
      linear: ['left', 'op', 'right'],
      tokens: {
        left: { text: '2' },
        op: { text: '+' },
        right: { text: '3' },
      },
      owner: {
        left: 'root.operation',
        op: 'root.operation',
        right: 'root.operation',
      },
    };

    let currentSelection: NodeId[] = [];
    const setSelection = vi.fn<(ids: NodeId[]) => void>((ids) => {
      currentSelection = ids;
    });
    const exec = vi.fn<(focus: NodeId[]) => void>();

    const cleanup = wireExecuteShortcuts(root, {
      getAst: () => ast,
      getSelection: () => currentSelection,
      setSelection,
      exec,
    });

    token.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

    expect(setSelection).toHaveBeenLastCalledWith(['root.operation']);
    expect(exec).toHaveBeenCalledTimes(1);
    expect(exec).toHaveBeenLastCalledWith(['op']);

    setSelection.mockClear();
    exec.mockClear();
    currentSelection = [];

    vi.useFakeTimers();

    token.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(221);

    expect(setSelection).toHaveBeenCalledTimes(1);
    expect(setSelection).toHaveBeenLastCalledWith(['root.operation']);
    expect(currentSelection).toEqual(['root.operation']);

    token.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(221);

    expect(setSelection).toHaveBeenCalledTimes(2);
    expect(setSelection).toHaveBeenLastCalledWith([]);
    expect(currentSelection).toEqual([]);

    vi.useRealTimers();

    exec.mockClear();
    currentSelection = ['x', 'op'];
    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(exec).toHaveBeenCalledTimes(1);
    expect(exec).toHaveBeenLastCalledWith(['x', 'op']);

    cleanup();
  });
});
