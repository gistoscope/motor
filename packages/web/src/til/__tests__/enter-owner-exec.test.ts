import { describe, it, expect, vi } from 'vitest';
import { wireExecuteShortcuts } from '../shortcuts.js';
import type { AST, NodeId } from '../opTokens.js';

const ast: AST = {
  linear: ['l', 'op', 'r'],
  tokens: {
    l: { text: '2' },
    op: { text: '+' },
    r: { text: '3' },
  },
  owner: {
    l: 'root.operation',
    op: 'root.operation',
    r: 'root.operation',
  },
  nodes: {
    'root.operation': {
      span: ['l', 'op', 'r'],
      type: 'Operation',
    },
  },
};

describe('wireExecuteShortcuts enter behavior', () => {
  it('executes when owner selection contains an operator via span', () => {
    vi.useFakeTimers();
    const root = document.createElement('div');
    let selection: NodeId[] = ['root.operation'];
    const exec = vi.fn();

    const cleanup = wireExecuteShortcuts(root, {
      getAst: () => ast,
      getSelection: () => selection,
      setSelection(ids) {
        selection = ids;
      },
      exec,
    });

    try {
      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      root.dispatchEvent(event);

      expect(exec).toHaveBeenCalledTimes(1);
      expect(exec).toHaveBeenCalledWith(['op']);
      expect(root.classList.contains('til-exec-flash')).toBe(true);

      vi.advanceTimersByTime(220);
      expect(root.classList.contains('til-exec-flash')).toBe(false);
    } finally {
      cleanup();
      vi.useRealTimers();
    }
  });

  it('executes when operator token is selected directly', () => {
    const root = document.createElement('div');
    const exec = vi.fn();

    const cleanup = wireExecuteShortcuts(root, {
      getAst: () => ast,
      getSelection: () => ['op'],
      setSelection() {},
      exec,
    });

    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    root.dispatchEvent(event);

    expect(exec).toHaveBeenCalledTimes(1);
    expect(exec).toHaveBeenCalledWith(['op']);

    cleanup();
  });
});
