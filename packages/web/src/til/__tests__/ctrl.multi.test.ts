import { describe, it, expect, vi, afterEach } from 'vitest';
import { wireExecuteShortcuts } from '../shortcuts';
import type { AST, NodeId } from '../opTokens';

const SINGLE_CLICK_DELAY = 220;

afterEach(() => {
  vi.useRealTimers();
});

function makeAst(): AST {
  return {
    linear: ['a', 'b'],
    tokens: {
      a: { text: 'A' },
      b: { text: 'B' }
    }
  };
}

describe('Ctrl/Meta multi-select', () => {
  it('toggles membership without clearing other selections', () => {
    vi.useFakeTimers();

    const root = document.createElement('div');
    const a = document.createElement('span');
    a.setAttribute('data-ast-id', 'a');
    const b = document.createElement('span');
    b.setAttribute('data-ast-id', 'b');
    root.append(a, b);

    const ast = makeAst();
    let selection: NodeId[] = [];
    const setSelection = vi.fn((ids: NodeId[]) => {
      selection = [...ids];
    });

    const cleanup = wireExecuteShortcuts(root, {
      getAst: () => ast,
      getSelection: () => selection,
      setSelection,
      exec: () => {}
    });

    a.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    vi.advanceTimersByTime(SINGLE_CLICK_DELAY + 10);
    expect(selection).toEqual(['a']);

    b.dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }));
    expect(new Set(selection)).toEqual(new Set(['a', 'b']));

    a.dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }));
    expect(selection).toEqual(['b']);

    cleanup();
  });
});
