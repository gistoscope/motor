import { createGraph, addNode, addEdge } from './core';
import { node, edge, makeId } from './api';
import type { GraspGraph } from './core';
import type { GraspId } from './types';

function assertInteger(value: unknown, name: string): number {
  const n = Number(value);
  if (!Number.isInteger(n)) {
    throw new Error(`${name} must be an integer`);
  }
  return n;
}

function assertPositive(value: number, name: string): number {
  if (value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

function assertNonNegative(value: number, name: string): number {
  if (value < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return value;
}

export function genChain(n: number): GraspGraph {
  const count = assertPositive(assertInteger(n, 'n'), 'n');
  const g = createGraph();
  for (let i = 1; i <= count; i++) {
    const idStr = String(i);
    const id = makeId(idStr);
    addNode(g, node(id, idStr));
  }
  for (let i = 1; i < count; i++) {
    const from = makeId(String(i));
    const to = makeId(String(i + 1));
    addEdge(g, edge(from, to));
  }
  return g;
}

export function genCycle(n: number): GraspGraph {
  const g = genChain(n);
  if (n > 1) {
    addEdge(g, edge(makeId(String(n)), makeId('1')));
  }
  return g;
}

export function genStar(n: number): GraspGraph {
  const count = assertPositive(assertInteger(n, 'n'), 'n');
  const g = createGraph();
  for (let i = 1; i <= count; i++) {
    const idStr = String(i);
    const id = makeId(idStr);
    addNode(g, node(id, idStr));
  }
  for (let i = 2; i <= count; i++) {
    addEdge(g, edge(makeId('1'), makeId(String(i))));
  }
  return g;
}

export function genGrid(rows: number, cols: number): GraspGraph {
  const rCount = assertPositive(assertInteger(rows, 'rows'), 'rows');
  const cCount = assertPositive(assertInteger(cols, 'cols'), 'cols');
  const g = createGraph();
  for (let r = 1; r <= rCount; r++) {
    for (let c = 1; c <= cCount; c++) {
      const idStr = `g_r${r}_c${c}`;
      addNode(g, node(makeId(idStr), idStr));
    }
  }
  for (let r = 1; r <= rCount; r++) {
    for (let c = 1; c <= cCount; c++) {
      const id = makeId(`g_r${r}_c${c}`);
      if (c < cCount) {
        addEdge(g, edge(id, makeId(`g_r${r}_c${c + 1}`)));
      }
      if (r < rCount) {
        addEdge(g, edge(id, makeId(`g_r${r + 1}_c${c}`)));
      }
    }
  }
  return g;
}

export function genTree(arity: number, depth: number): GraspGraph {
  const k = assertPositive(assertInteger(arity, 'arity'), 'arity');
  const d = assertNonNegative(assertInteger(depth, 'depth'), 'depth');
  const g = createGraph();
  const rootIdStr = 't_0';
  const rootId = makeId(rootIdStr);
  addNode(g, node(rootId, rootIdStr));
  if (d === 0) {
    return g;
  }
  type Frame = { id: GraspId; depth: number };
  const queue: Frame[] = [{ id: rootId, depth: 0 }];
  let nextIndex = 1;
  while (queue.length) {
    const current = queue.shift()!;
    if (current.depth === d) continue;
    for (let i = 0; i < k; i++) {
      const childIdStr = `t_${nextIndex++}`;
      const childId = makeId(childIdStr);
      addNode(g, node(childId, childIdStr));
      addEdge(g, edge(current.id, childId));
      queue.push({ id: childId, depth: current.depth + 1 });
    }
  }
  return g;
}

export function genBipartite(left: number, right: number): GraspGraph {
  const l = assertNonNegative(assertInteger(left, 'left'), 'left');
  const r = assertNonNegative(assertInteger(right, 'right'), 'right');
  const g = createGraph();
  const leftIds: GraspId[] = [];
  const rightIds: GraspId[] = [];
  for (let i = 1; i <= l; i++) {
    const idStr = `bL_${i}`;
    const id = makeId(idStr);
    leftIds.push(id);
    addNode(g, node(id, idStr));
  }
  for (let j = 1; j <= r; j++) {
    const idStr = `bR_${j}`;
    const id = makeId(idStr);
    rightIds.push(id);
    addNode(g, node(id, idStr));
  }
  for (const from of leftIds) {
    for (const to of rightIds) {
      addEdge(g, edge(from, to));
    }
  }
  return g;
}
