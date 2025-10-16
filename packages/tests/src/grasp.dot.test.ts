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

describe('toDOT', () => {
  it('emits deterministic DOT for a small graph', () => {
    const g = small();
    const dot = toDOT(g, { graphName: 'T' });
    const expected = [
      'digraph T {',
      '  "A" [label="A"];',
      '  "B" [label="B"];',
      '  "C" [label="C"];',
      '  "A" -> "B";',
      '  "B" -> "C";',
      '}'
    ].join('\n');
    expect(dot).toBe(expected);
  });
});
