import { describe, it, expect } from 'vitest';
import {
  makeId, node, edge,
  createGraph, addNode, addEdge,
  nodes, edges, hasEdge, size,
  removeEdge, removeNode
} from '@motor/grasp';

describe('grasp mutations', () => {
  it('removeEdge is idempotent and updates queries', () => {
    const g = createGraph();
    const A = makeId('A'), B = makeId('B');
    addNode(g, node(A, 'A'));
    addNode(g, node(B, 'B'));
    addEdge(g, edge(A, B));
    expect(hasEdge(g, A, B)).toBe(true);

    expect(removeEdge(g, A, B)).toBe(true);   // first time deletes
    expect(hasEdge(g, A, B)).toBe(false);
    expect(removeEdge(g, A, B)).toBe(false);  // second time no-op
    expect(edges(g)).toEqual([]);
  });

  it('removeNode deletes all incident edges and is idempotent', () => {
    const g = createGraph();
    const A = makeId('A'), B = makeId('B'), C = makeId('C');
    addNode(g, node(A, 'A'));
    addNode(g, node(B, 'B'));
    addNode(g, node(C, 'C'));
    addEdge(g, edge(A, B));
    addEdge(g, edge(B, C));
    addEdge(g, edge(A, C));

    // before
    expect(size(g)).toEqual({ nodes: 3, edges: 3 });

    const r1 = removeNode(g, B);
    expect(r1.removedOut).toBe(1);   // B -> C
    expect(r1.removedIn).toBe(1);    // A -> B
    expect(hasEdge(g, A, B)).toBe(false);
    expect(hasEdge(g, B, C)).toBe(false);
    expect(nodes(g)).toEqual(['A','C']); // B gone from adjacency
    expect(size(g)).toEqual({ nodes: 2, edges: 1 }); // only A->C remains

    const r2 = removeNode(g, B); // idempotent
    expect(r2.removedOut).toBe(0);
    expect(r2.removedIn).toBe(0);
  });
});
