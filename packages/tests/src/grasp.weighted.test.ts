import { describe, it, expect } from 'vitest';
import {
  makeId, node, edge,
  createGraph, addNode, addEdge,
} from '@motor/grasp';
import { dijkstra } from '@motor/grasp';

const A = makeId('A'), B = makeId('B'), C = makeId('C'), D = makeId('D');

// small weighted graph:
// A->B (2), A->C (5), B->C (1), B->D (3), C->D (1)
function smallWeighted() {
  const g = createGraph();
  [A, B, C, D].forEach(id => addNode(g, node(id, String(id))));
  addEdge(g, edge(A, B));
  addEdge(g, edge(A, C));
  addEdge(g, edge(B, C));
  addEdge(g, edge(B, D));
  addEdge(g, edge(C, D));
  const W = new Map<string, number>([
    [`${A}->${B}`, 2],
    [`${A}->${C}`, 5],
    [`${B}->${C}`, 1],
    [`${B}->${D}`, 3],
    [`${C}->${D}`, 1],
  ]);
  const w = (u: typeof A, v: typeof A) => {
    const k = `${u}->${v}`;
    const val = W.get(k);
    if (val === undefined) throw new Error(`missing weight for ${k}`);
    return val;
  };
  return { g, w };
}

describe('weighted shortest paths (dijkstra)', () => {
  it('computes the minimal distance and path', () => {
    const { g, w } = smallWeighted();
    const res = dijkstra(g, A, D, w);
    expect(res).not.toBeNull();
    // A->B->D costs 2 + 3 = 5; A->B->C->D costs 2+1+1 = 4 (shorter)
    expect(res!.distance).toBe(4);
    expect(res!.path).toEqual([A, B, C, D]);
  });

  it('handles from === to case', () => {
    const { g, w } = smallWeighted();
    const res = dijkstra(g, A, A, w);
    expect(res).toEqual({ distance: 0, path: [A] });
  });

  it('returns null when unreachable', () => {
    const { g, w } = smallWeighted();
    // remove A->B and A->C to isolate A
    // We are not mutating the graph API here; just simulate unreachable by a copy:
    const isolated = { adj: new Map(g.adj) };
    isolated.adj.set(A, new Set()); // no outgoing edges from A
    const res = dijkstra(isolated as any, A, D, w);
    expect(res).toBeNull();
  });
});
