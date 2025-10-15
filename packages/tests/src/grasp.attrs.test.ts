import { describe, it, expect } from 'vitest';
import { makeId, node, edge, createGraph, addNode, addEdge, removeNode, removeEdge } from '@motor/grasp';
import {
  createAttrs, setNodeAttr, getNodeAttr, deleteNodeAttr,
  setEdgeAttr, getEdgeAttr, deleteEdgeAttr, purgeDanglingAttrs
} from '@motor/grasp';

const A = makeId('A'), B = makeId('B');

function small() {
  const g = createGraph();
  addNode(g, node(A, 'A'));
  addNode(g, node(B, 'B'));
  addEdge(g, edge(A, B));
  return g;
}

describe('attrs sidecar', () => {
  it('sets/gets/deletes node attrs', () => {
    const g = small();
    const a = createAttrs();
    setNodeAttr(a, A, 'color', 'red');
    expect(getNodeAttr(a, A, 'color')).toBe('red');
    expect(deleteNodeAttr(a, A, 'color')).toBe(true);
    expect(getNodeAttr(a, A, 'color')).toBeUndefined();
  });

  it('sets/gets/deletes edge attrs', () => {
    const g = small();
    const a = createAttrs();
    setEdgeAttr(a, A, B, 'w', 3);
    expect(getEdgeAttr(a, A, B, 'w')).toBe(3);
    expect(deleteEdgeAttr(a, A, B, 'w')).toBe(true);
    expect(getEdgeAttr(a, A, B, 'w')).toBeUndefined();
  });

  it('purges dangling attrs after graph mutations', () => {
    const g = small();
    const a = createAttrs();
    setNodeAttr(a, A, 'foo', 1);
    setEdgeAttr(a, A, B, 'bar', 2);

    removeEdge(g, A, B);
    removeNode(g, A);

    purgeDanglingAttrs(a, g);
    expect(getNodeAttr(a, A, 'foo')).toBeUndefined();
    expect(getEdgeAttr(a, A, B, 'bar')).toBeUndefined();
  });
});
