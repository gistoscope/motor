import { describe, it, expect, vi } from 'vitest';
import { wireDragSelection } from '../events.drag';
import type { AST, NodeId } from '../opTokens';

function ensurePointerEvent() {
  if (typeof PointerEvent === 'undefined') {
    class PointerEventPolyfill extends MouseEvent {
      pointerId: number;
      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.pointerId = init.pointerId ?? 1;
      }
    }
    // @ts-ignore
    globalThis.PointerEvent = PointerEventPolyfill as typeof PointerEvent;
  }
}

function makeAst(): AST {
  return {
    linear: ['left', 'op', 'right'],
    tokens: {
      left: { text: '2' },
      op: { text: '+' },
      right: { text: '3' }
    },
    owner: {
      left: 'operation',
      op: 'operation',
      right: 'operation'
    },
    nodes: {
      operation: {
        span: ['left', 'op', 'right'],
        type: 'Operation',
        parent: 'root'
      },
      root: {
        span: ['left', 'op', 'right'],
        type: 'Root'
      }
    },
    parent: {
      operation: 'root'
    }
  };
}

describe('drag selection LCA', () => {
  it('selects the operation span when dragging between operands', () => {
    ensurePointerEvent();

    const root = document.createElement('div');
    const left = document.createElement('span');
    left.setAttribute('data-ast-id', 'left');
    const op = document.createElement('span');
    op.setAttribute('data-ast-id', 'op');
    const right = document.createElement('span');
    right.setAttribute('data-ast-id', 'right');
    root.append(left, op, right);

    const ast = makeAst();
    let selection: NodeId[] = [];
    const setSelection = vi.fn((ids: NodeId[]) => {
      selection = [...ids];
    });

    const cleanup = wireDragSelection(root, {
      getAst: () => ast,
      getSelection: () => selection,
      setSelection
    });

    left.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, button: 0 }));
    right.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));

    expect(setSelection).toHaveBeenLastCalledWith(['left', 'op', 'right']);
    expect(selection).toEqual(['left', 'op', 'right']);

    cleanup();
  });
});
