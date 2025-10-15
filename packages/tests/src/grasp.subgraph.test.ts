import { describe, it, expect } from 'vitest';
import { makeId, node, edge, createGraph, addNode, addEdge } from '@motor/grasp';
import { inducedSubgraph, filterNodes, filterEdges } from '@motor/grasp';

const A = makeId('A'), B = makeId('B'), C = makeId('C'), D = makeId('D');

function small() {
  const g = createGraph();
  [A,B,C,D].forEach(id => addNode(g, node(id, String(id))));
  addEdge(g, edge(A,B));
  addEdge(g, edge(B,C));
  addEdge(g, edge(C,D));
  addEdge(g, edge(A,D));
  return g;
}

describe('subgraph & filters', () => {
  it('inducedSubgraph keeps only chosen nodes & internal edges', () => {
    const g = small();
    const sub = inducedSubgraph(g, [A,B,C]);
    expect(Array.from(sub.adj.get(A) ?? [])).toEqual([B]);
    expect(sub.adj.has(D)).toBe(false);
  });

  it('filterNodes delegates to inducedSubgraph', () => {
    const g = small();
    const sub = filterNodes(g, id => String(id) !== 'C' && String(id) !== 'D');
    expect(sub.adj.has(C)).toBe(false);
    expect(sub.adj.has(D)).toBe(false);
  });

  it('filterEdges keeps only edges matching predicate', () => {
    const g = small();
    const onlyA = filterEdges(g, (u, _v) => String(u) === 'A');
    expect(Array.from(onlyA.adj.keys())).toContain(A);
    expect(Array.from(onlyA.adj.get(A)!)).toEqual(expect.arrayContaining([B, D]));
    expect(onlyA.adj.has(B)).toBe(false);
  });
});
