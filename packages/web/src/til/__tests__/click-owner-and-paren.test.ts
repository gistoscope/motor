import { describe, it, expect, vi } from 'vitest';
import { wireExecuteShortcuts } from '../shortcuts';
import type { AST, NodeId } from '../opTokens';

describe('til click selection', () => {
  it('selects owner when clicking inside operation owner element', async () => {
    vi.useFakeTimers();
    const root = document.createElement('div');
    const operation = document.createElement('span');
    operation.setAttribute('data-ast-id', 'root.operation');
    operation.setAttribute('data-ast-type', 'Operation');

    const left = document.createElement('span');
    left.setAttribute('data-ast-id', 'left');
    left.textContent = '2';
    const operator = document.createElement('span');
    operator.setAttribute('data-ast-id', 'op');
    operator.textContent = '+';
    const right = document.createElement('span');
    right.setAttribute('data-ast-id', 'right');
    right.textContent = '3';

    operation.append(left, operator, right);
    root.append(operation);

    const ast: AST = {
      linear: ['left', 'op', 'right'],
      tokens: {
        left: { text: '2' },
        op: { text: '+' },
        right: { text: '3' }
      },
      owner: {
        left: 'root.operation',
        op: 'root.operation',
        right: 'root.operation',
        'root.operation': 'root.operation'
      },
      nodes: {
        'root.operation': {
          span: ['left', 'op', 'right'],
          type: 'Operation'
        }
      }
    };

    let selection: NodeId[] = [];
    const setSelection = vi.fn<(ids: NodeId[]) => void>((ids) => {
      selection = ids;
    });

    const cleanup = wireExecuteShortcuts(root, {
      getAst: () => ast,
      getSelection: () => selection,
      setSelection,
      exec: vi.fn()
    });

    try {
      operation.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await vi.advanceTimersByTimeAsync(221);
      expect(setSelection).toHaveBeenCalledWith(['root.operation']);
      expect(selection).toEqual(['root.operation']);
    } finally {
      cleanup();
      vi.useRealTimers();
    }
  });

  it('selects group owner when clicking on opening parenthesis token', async () => {
    vi.useFakeTimers();
    const root = document.createElement('div');
    const group = document.createElement('span');
    group.setAttribute('data-ast-id', 'root.group');
    group.setAttribute('data-ast-type', 'Paren');

    const open = document.createElement('span');
    open.setAttribute('data-ast-id', 'open');
    open.setAttribute('data-ast-role', 'paren-open');
    open.textContent = '(';

    const inner = document.createElement('span');
    inner.setAttribute('data-ast-id', 'inner');
    inner.textContent = '5';

    const close = document.createElement('span');
    close.setAttribute('data-ast-id', 'close');
    close.setAttribute('data-ast-role', 'paren-close');
    close.textContent = ')';

    group.append(open, inner, close);
    root.append(group);

    const ast: AST = {
      linear: ['open', 'inner', 'close'],
      tokens: {
        open: { text: '(' },
        inner: { text: '5' },
        close: { text: ')' }
      },
      owner: {
        open: 'root.group',
        inner: 'root.group',
        close: 'root.group',
        'root.group': 'root.group'
      },
      nodes: {
        'root.group': {
          span: ['open', 'inner', 'close'],
          type: 'Paren'
        }
      }
    };

    let selection: NodeId[] = [];
    const setSelection = vi.fn<(ids: NodeId[]) => void>((ids) => {
      selection = ids;
    });

    const cleanup = wireExecuteShortcuts(root, {
      getAst: () => ast,
      getSelection: () => selection,
      setSelection,
      exec: vi.fn()
    });

    try {
      open.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await vi.advanceTimersByTimeAsync(221);
      expect(setSelection).toHaveBeenCalledWith(['root.group']);
      expect(selection).toEqual(['root.group']);
    } finally {
      cleanup();
      vi.useRealTimers();
    }
  });
});
