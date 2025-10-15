import { describe, it, expect } from 'vitest';
import { makeId, node, edge, createGraph, addNode, addEdge } from '@motor/grasp';
import { toJSON, fromJSON, validateGraphJSON } from '@motor/grasp';

const A = makeId('A'), B = makeId('B');

function small() {
  const g = createGraph();
  addNode(g, node(A, 'A'));
  addNode(g, node(B, 'B'));
  addEdge(g, edge(A, B, 'A->B'));
  return g;
}

describe('io: toJSON/fromJSON', () => {
  it('roundtrips a small graph', () => {
    const g1 = small();
    const json = toJSON(g1);
    const v = validateGraphJSON(json);
    expect(v.ok).toBe(true);

    const g2 = fromJSON(json);
    // Проверим базовую эквивалентность
    const json2 = toJSON(g2);
    expect(JSON.stringify(json2)).toBe(JSON.stringify(json));
  });

  it('rejects invalid json', () => {
    const bad = { nodes: [{ id: '', label: 1 }], edges: [{ from: 'X', to: 'Y' }] } as any;
    const v = validateGraphJSON(bad);
    expect(v.ok).toBe(false);
    expect(v.errors.length).toBeGreaterThan(0);
  });
});
