import { describe, it, expect } from 'vitest';
import { wireExecuteShortcuts } from '../shortcuts';
import type { AST, NodeId } from '../opTokens';

function makeAst(linear: NodeId[], text: Record<NodeId, string>): AST {
  return {
    linear,
    tokens: Object.fromEntries(
      Object.entries(text).map(([k, v]) => [k, { text: v }]),
    ),
  };
}

describe('wireExecuteShortcuts', () => {
  it('double-clicking an operator sets selection and executes with neighbors', () => {
    const root = document.createElement('div');
    const token = document.createElement('span');
    token.setAttribute('data-ast-id', 'op');
    root.append(token);

    const ast = makeAst(['left', 'op', 'right'], { left: '1', op: '+', right: '2' });

    let selectionSet: NodeId[] | undefined;
    let executed: NodeId[] | undefined;

    const cleanup = wireExecuteShortcuts(root, {
      getAst: () => ast,
      getSelection: () => [],
      setSelection(ids) {
        selectionSet = ids;
      },
      exec(focus) {
        executed = focus;
      },
    });

    token.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

    expect(selectionSet).toEqual(['left', 'op', 'right']);
    expect(executed).toEqual(['left', 'op', 'right']);

    cleanup();
  });

  it('pressing Enter with an operator in selection executes', () => {
    const root = document.createElement('div');
    const ast = makeAst(['a', 'op', 'b'], { a: '4', op: '-', b: '3' });

    let executed: NodeId[] | undefined;

    const cleanup = wireExecuteShortcuts(root, {
      getAst: () => ast,
      getSelection: () => ['op'],
      setSelection() {},
      exec(focus) {
        executed = focus;
      },
    });

    root.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(executed).toEqual(['op']);

    cleanup();
  });
});
