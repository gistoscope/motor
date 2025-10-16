import { describe, it, expect } from 'vitest';
import {
  createGraph, addNode, addEdge,
  makeId, node, edge,
  toJSON, fromJSON, validateGraphJSON
} from '@motor/grasp';

const A = makeId('A'), B = makeId('B'), C = makeId('C');

function small() {
  const g = createGraph();
  [A, B, C].forEach(id => addNode(g, node(id, String(id))));
  addEdge(g, edge(A, B));
  addEdge(g, edge(B, C));
  return g;
}

function norm(g: ReturnType<typeof createGraph>) {
  return Array.from(g.adj.entries())
    .map(([k, vs]) => [String(k), Array.from(vs).map(String).sort()] as [string, string[]])
    .sort((a, b) => a[0].localeCompare(b[0]));
}

describe('io: toJSON/fromJSON', () => {
  it('roundtrips a small graph', () => {
    const g1 = small();
    const json = toJSON(g1);
    const v = validateGraphJSON(json);
    expect(v.ok).toBe(true);
    const g2 = fromJSON(json);
    expect(norm(g2)).toEqual(norm(g1));
  });

  it('rejects invalid json', () => {
    const bad = { nodes: [{ id: '', label: 1 }], edges: [{ from: 'X', to: 'Y' }] } as any;
    const v = validateGraphJSON(bad);
    expect(v.ok).toBe(false);
    expect(v.errors.length).toBeGreaterThan(0);
  });
});
