/* @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { wireAltClickExpand } from '../events.expand';

describe('Alt+Click persist', () => {
  it('expands to owner and persists selection', () => {
    const root = document.createElement('div');
    const leaf = document.createElement('span');
    leaf.setAttribute('data-ast-id', 'n1');
    root.append(leaf);

    const ast = { owner: { n1: 'op.root' } };

    let selection: string[] = [];
    const un = wireAltClickExpand(root, {
      getAst: () => ast,
      getSelection: () => selection,
      setSelection(ids) { selection = ids; },
    });

    const ev = new MouseEvent('click', { bubbles: true, altKey: true });
    leaf.dispatchEvent(ev);

    expect(selection).toEqual(['op.root']);
    un?.();
  });
});
