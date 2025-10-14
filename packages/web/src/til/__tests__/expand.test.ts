/* @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { wireAltClickExpand } from '../events.expand.js';
import { expandToNode } from '../astNavigator.js';
import type { AST, NodeId } from '../astNavigator.js';

function makeAst(linear: NodeId[], text: Record<NodeId, string>, extra: Partial<AST> = {}): AST {
  return {
    linear,
    tokens: Object.fromEntries(Object.entries(text).map(([k, v]) => [k, { text: v }])),
    ...extra,
  };
}

describe('expandToNode & wireAltClickExpand', () => {
  it('paren group: span from "(" to matching ")"', () => {
    const ast = makeAst(['o', 'a', 'b', 'c', 'c1'], { o: '(', a: '1', b: '+', c: ')', c1: '*' });
    const span = expandToNode(ast, 'o');
    expect(span).toEqual(['o', 'a', 'b', 'c']);
  });

  it('Alt+Click expands selection to node span', () => {
    const root = document.createElement('div');
    const token = document.createElement('span');
    token.setAttribute('data-ast-id', 'n');
    root.append(token);

    const ast = makeAst(['n'], { n: 'x' });

    let selection: NodeId[] | undefined;
    const detach = wireAltClickExpand(root, {
      getAst: () => ast,
      getSelection: () => [],
      setSelection(ids) {
        selection = ids;
      },
    });

    token.dispatchEvent(new MouseEvent('click', { bubbles: true, altKey: true }));
    expect(selection).toEqual(['n']);

    detach();
  });
});
