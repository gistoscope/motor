import { describe, it, expect } from 'vitest';
import { createGraph, addNode, addEdge, makeId, node, edge, toDOT } from '@motor/grasp';

const A = makeId('A'), B = makeId('B'), C = makeId('C');

function small() {
  const g = createGraph();
  [A, B, C].forEach(id => addNode(g, node(id, String(id))));
  addEdge(g, edge(A, B));
  addEdge(g, edge(B, C));
  return g;
}

describe('snapshot: toDOT', () => {
  it('emits stable DOT', () => {
    const g = small();
    expect(toDOT(g, { graphName: 'T' })).toMatchInlineSnapshot(`
      "digraph T {
        \"A\" [label=\"A\"];
        \"B\" [label=\"B\"];
        \"C\" [label=\"C\"];
        \"A\" -> \"B\";
        \"B\" -> \"C\";
      }"
    `);
  });
});
