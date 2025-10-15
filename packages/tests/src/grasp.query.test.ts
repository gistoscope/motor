import { describe, it, expect } from 'vitest';
import {
  makeId, node, edge,
  createGraph, addNode, addEdge,
  nodes, edges, hasEdge, degree, size
} from '@motor/grasp';

describe('grasp query helpers', () => {
  it('lists nodes/edges and computes degree/size', () => {
    const g = createGraph();
    const A = makeId('A'), B = makeId('B'), C = makeId('C');
    addNode(g, node(A, 'A'));
    addNode(g, node(B, 'B'));
    addEdge(g, edge(A, B));
    addEdge(g, edge(B, C));

    expect(nodes(g)).toEqual(['A','B','C']);          // order deterministic
    expect(edges(g)).toEqual([{ from: A, to: B }, { from: B, to: C }]);
    expect(hasEdge(g, A, B)).toBe(true);
    expect(hasEdge(g, A, C)).toBe(false);
    expect(degree(g, A)).toEqual({ out: 1, in: 0 });
    expect(degree(g, B)).toEqual({ out: 1, in: 1 });
    expect(size(g)).toEqual({ nodes: 3, edges: 2 });
  });
});
