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

describe('inspect', () => {
  it('prints deterministic, readable dump', () => {
    const g = small();
    const expected = [
      'nodes: "A" [A], "B" [B], "C" [C]',
      'edges:',
      '  "A" -> "B"',
      '  "B" -> "C"'
    ].join('\n');
    expect(inspect(g)).toBe(expected);
  });

  it('prints (none) for empty graph', () => {
    const g = createGraph();
    const expected = ['nodes: (none)', 'edges:', '  (none)'].join('\n');
    expect(inspect(g)).toBe(expected);
  });
});
