import { describe, it, expect, vi, afterEach } from 'vitest';
import { wireExecuteShortcuts } from '../shortcuts';
import { wireAltClickExpand } from '../events.expand';
import type { NodeId, AST } from '../opTokens';

const SINGLE_CLICK_DELAY = 220;

afterEach(() => {
  vi.useRealTimers();
});

function makeGroupAst(): AST {
  return {
    linear: ['open', 'value', 'close'],
    tokens: {
      open: { text: '(' },
      value: { text: '2' },
      close: { text: ')' }
    },
    owner: {
      open: 'group',
      value: 'group',
      close: 'group'
    },
    nodes: {
      group: {
        span: ['open', 'value', 'close'],
        type: 'Paren',
        parent: null
      }
    },
    parent: {}
  };
}

describe('Alt+Click expand persistence', () => {
  it('keeps the expanded selection after Alt+Click', () => {
    vi.useFakeTimers();

    const root = document.createElement('div');
    const token = document.createElement('span');
    token.setAttribute('data-ast-id', 'value');
    root.append(token);

    const ast = makeGroupAst();
    let selection: NodeId[] = [];
    const setSelection = vi.fn((ids: NodeId[]) => {
      selection = [...ids];
    });

    const shortcutsCleanup = wireExecuteShortcuts(root, {
      getAst: () => ast,
      getSelection: () => selection,
      setSelection,
      exec: () => {}
    });

    const expandCleanup = wireAltClickExpand(root, {
      getAst: () => ast,
      getSelection: () => selection,
      setSelection
    });

    token.dispatchEvent(
      new MouseEvent('click', { bubbles: true, altKey: true }),
    );

    expect(setSelection).toHaveBeenLastCalledWith(['open', 'value', 'close']);
    expect(selection).toEqual(['open', 'value', 'close']);

    vi.advanceTimersByTime(SINGLE_CLICK_DELAY + 20);

    expect(selection).toEqual(['open', 'value', 'close']);

    expandCleanup();
    shortcutsCleanup();
  });
});
