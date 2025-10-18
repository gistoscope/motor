import { describe, it, expect, vi } from 'vitest';
import { wireExecuteShortcuts } from '../shortcuts';
import type { AST, NodeId } from '../opTokens';

function makeParenAst(): AST {
  return {
    linear: ['open', 'close'],
    tokens: {
      open: { text: '(' },
      close: { text: ')' }
    },
    owner: {
      open: 'root.paren',
      close: 'root.paren'
    },
    nodes: {
      'root.paren': {
        span: ['open', 'close'],
        type: 'Paren'
      }
    }
  };
}

describe('wireExecuteShortcuts - paren double click', () => {
  it('selects the paired group when double-clicking parentheses', () => {
    const root = document.createElement('div');
    const open = document.createElement('span');
    open.setAttribute('data-ast-id', 'open');
    open.setAttribute('data-ast-role', 'paren-open');
    const close = document.createElement('span');
    close.setAttribute('data-ast-id', 'close');
    close.setAttribute('data-ast-role', 'paren-close');

    root.append(open, close);

    const ast = makeParenAst();
    let selection: NodeId[] = [];
    const setSelection = vi.fn((ids: NodeId[]) => {
      selection = [...ids];
    });
    const exec = vi.fn();

    const cleanup = wireExecuteShortcuts(root, {
      getAst: () => ast,
      getSelection: () => selection,
      setSelection,
      exec
    });

    open.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(setSelection).toHaveBeenLastCalledWith(['root.paren']);
    expect(exec).not.toHaveBeenCalled();

    setSelection.mockClear();
    exec.mockClear();

    close.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(setSelection).toHaveBeenLastCalledWith(['root.paren']);
    expect(exec).not.toHaveBeenCalled();

    cleanup();
  });
});
