import type { GraspId, GraspNode, GraspEdge } from './types';

export type GraspGraph = { adj: Map<GraspId, Set<GraspId>> };

export function createGraph(): GraspGraph {
  return { adj: new Map() };
}

export function addNode(g: GraspGraph, n: GraspNode): void {
  if (!g.adj.has(n.id)) g.adj.set(n.id, new Set());
}

export function addEdge(g: GraspGraph, e: GraspEdge): void {
  // идемпотентно
  addNode(g, { id: e.from, label: '' } as GraspNode);
  addNode(g, { id: e.to, label: '' } as GraspNode);
  g.adj.get(e.from)!.add(e.to);
}

export function getNeighbors(g: GraspGraph, id: GraspId): GraspId[] {
  return Array.from(g.adj.get(id) ?? []).sort();
}

export function pathExists(g: GraspGraph, from: GraspId, to: GraspId): boolean {
  if (from === to) return true;
  const seen = new Set<GraspId>([from]);
  const q: GraspId[] = [from];
  while (q.length) {
    const cur = q.shift()!;
    for (const nxt of g.adj.get(cur) ?? []) {
      if (nxt === to) return true;
      if (!seen.has(nxt)) { seen.add(nxt); q.push(nxt); }
    }
  }
  return false;
}
