import { describe, it, expect } from 'vitest';
import {
  makeId, node, edge,
  createGraph, addNode, addEdge,
  bfs, dfs, pathExists, shortestPath
} from '@motor/grasp';

const A = makeId('A'), B = makeId('B'), C = makeId('C'), D = makeId('D');

function gSmall() {
  const g = createGraph();
  [A,B,C,D].forEach(id => addNode(g, node(id, String(id))));
  addEdge(g, edge(A,B));
  addEdge(g, edge(B,C));
  addEdge(g, edge(A,D));
  return g;
}

describe('traversals & reachability', () => {
  it('bfs/dfs produce valid orders', () => {
    const g = gSmall();
    expect(bfs(g, A)[0]).toBe(A);
    expect(new Set(bfs(g, A))).toEqual(new Set([A,B,D,C]));
    expect(new Set(dfs(g, A))).toEqual(new Set([A,B,C,D]));
  });

  it('pathExists detects reachability and reflexivity', () => {
    const g = gSmall();
    expect(pathExists(g, A, C)).toBe(true);
    expect(pathExists(g, D, C)).toBe(false);
    expect(pathExists(g, A, A)).toBe(true);
  });

  it('shortestPath returns unweighted shortest path or null', () => {
    const g = gSmall();
    expect(shortestPath(g, A, C)).toEqual([A,B,C]);
    expect(shortestPath(g, D, C)).toBeNull();
    expect(shortestPath(g, A, A)).toEqual([A]);
  });
});
