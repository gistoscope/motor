import { describe, it, expect } from 'vitest';
import { makeId, node, edge, createGraph, addNode, addEdge, getNeighbors, pathExists } from '@motor/grasp';

describe('grasp core', () => {
  it('neighbors and path', () => {
    const g = createGraph();
    const A = makeId('A'), B = makeId('B'), C = makeId('C');
    addNode(g, node(A, 'A'));
    addNode(g, node(B, 'B'));
    addEdge(g, edge(A, B));
    addEdge(g, edge(B, C));
    expect(getNeighbors(g, A)).toEqual(['B']);
    expect(pathExists(g, A, C)).toBe(true);
    expect(pathExists(g, C, A)).toBe(false);
    // идемпотентность
    addEdge(g, edge(A, B));
    expect(getNeighbors(g, A)).toEqual(['B']);
  });
});
