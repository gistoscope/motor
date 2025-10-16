import { describe, it, expect } from 'vitest';
import { createGraph, addNode, addEdge, makeId, node, edge, inspect } from '@motor/grasp';

const A = makeId('A'), B = makeId('B'), C = makeId('C');

function small() {
  const g = createGraph();
  [A, B, C].forEach(id => addNode(g, node(id, String(id))));
  addEdge(g, edge(A, B));
  addEdge(g, edge(B, C));
  return g;
}

describe('snapshot: inspect', () => {
  it('emits stable human-readable dump', () => {
    const g = small();
    expect(inspect(g)).toMatchInlineSnapshot(`
      nodes: "A" [A], "B" [B], "C" [C]
      edges:
        "A" -> "B"
        "B" -> "C"
    `);
  });

  it('prints (none) for empty graph', () => {
    const g = createGraph();
    expect(inspect(g)).toMatchInlineSnapshot(`
      nodes: (none)
      edges:
        (none)
    `);
  });
});
