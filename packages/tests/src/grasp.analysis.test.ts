import { describe, it, expect } from 'vitest';
import {
  makeId, node, edge,
  createGraph, addNode, addEdge,
  hasCycleDirected, topoSort, scc
} from '@motor/grasp';

const A = makeId('A'), B = makeId('B'), C = makeId('C'), D = makeId('D');

function dag() {
  const g = createGraph();
  [A,B,C,D].forEach(id => addNode(g, node(id, String(id))));
  addEdge(g, edge(A, B));
  addEdge(g, edge(B, C));
  addEdge(g, edge(A, D));
  return g;
}

function cycled() {
  const g = dag();
  addEdge(g, edge(C, A)); // цикл A->B->C->A
  return g;
}

function asSet<T>(arr: readonly T[]) { return new Set(arr); }

describe('analysis: cycle/toposort/scc', () => {
  it('detects cycle presence', () => {
    expect(hasCycleDirected(dag())).toBe(false);
    expect(hasCycleDirected(cycled())).toBe(true);
  });

  it('topoSort returns order on DAG and null on cycle', () => {
    const order = topoSort(dag());
    expect(order).not.toBeNull();
    const o = order!;
    // В DAG A должен предшествовать B, C и D
    expect(o.indexOf(A)).toBeLessThan(o.indexOf(B));
    expect(o.indexOf(A)).toBeLessThan(o.indexOf(D));
    expect(o.indexOf(B)).toBeLessThan(o.indexOf(C));
    expect(topoSort(cycled())).toBeNull();
  });

  it('scc groups nodes correctly', () => {
    const compsDAG = scc(dag()).map(asSet);
    // В DAG все компоненты размера 1
    expect(compsDAG.every(s => s.size === 1)).toBe(true);

    const compsC = scc(cycled()).map(asSet);
    // Должен быть один крупный SCC с {A,B,C} и отдельный {D}
    const hasABC = compsC.some(s => s.size === 3 && s.has(A) && s.has(B) && s.has(C));
    const hasD   = compsC.some(s => s.size === 1 && s.has(D));
    expect(hasABC && hasD).toBe(true);
  });
});
