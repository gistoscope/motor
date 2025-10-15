// packages/grasp/src/traverse.ts
import type { GraspId } from './types';

export type AnyGraph = Record<string, unknown>;

/** Return outgoing neighbors for a node, tolerating different internal shapes. */
function outNeighbors(g: AnyGraph, id: GraspId): GraspId[] {
  // 1) adj: Map<GraspId, Set<GraspId>>
  const adj = (g as any)?.adj;
  if (adj instanceof Map) {
    const set = adj.get(id);
    return set ? Array.from(set) : [];
  }

  // 2) edges: Array<{ from: GraspId; to: GraspId }>
  const edges = (g as any)?.edges;
  if (Array.isArray(edges)) {
    return edges.filter((e: any) => e?.from === id).map((e: any) => e.to);
  }

  // 3) outNeighbors function on graph
  const fn = (g as any)?.outNeighbors;
  if (typeof fn === 'function') {
    return fn(id) ?? [];
  }

  return [];
}

export function bfs(g: AnyGraph, start: GraspId): GraspId[] {
  const seen = new Set<GraspId>();
  const order: GraspId[] = [];
  if (start == null) return order;
  const q: GraspId[] = [start];
  seen.add(start);
  while (q.length) {
    const v = q.shift()!;
    order.push(v);
    for (const w of outNeighbors(g, v)) {
      if (!seen.has(w)) { seen.add(w); q.push(w); }
    }
  }
  return order;
}

export function dfs(g: AnyGraph, start: GraspId): GraspId[] {
  const seen = new Set<GraspId>();
  const order: GraspId[] = [];
  if (start == null) return order;
  (function visit(v: GraspId) {
    seen.add(v);
    order.push(v);
    for (const w of outNeighbors(g, v)) {
      if (!seen.has(w)) visit(w);
    }
  })(start);
  return order;
}

export function pathExists(g: AnyGraph, from: GraspId, to: GraspId): boolean {
  if (from === to) return true;
  const seen = new Set<GraspId>([from as GraspId]);
  const q: GraspId[] = [from as GraspId];
  while (q.length) {
    const v = q.shift()!;
    for (const w of outNeighbors(g, v)) {
      if (w === to) return true;
      if (!seen.has(w)) { seen.add(w); q.push(w); }
    }
  }
  return false;
}

export function shortestPath(g: AnyGraph, from: GraspId, to: GraspId): GraspId[] | null {
  if (from === to) return [from];
  const seen = new Set<GraspId>([from as GraspId]);
  const prev = new Map<GraspId, GraspId>();
  const q: GraspId[] = [from as GraspId];

  while (q.length) {
    const v = q.shift()!;
    for (const w of outNeighbors(g, v)) {
      if (seen.has(w)) continue;
      seen.add(w);
      prev.set(w, v);
      if (w === to) {
        const path: GraspId[] = [to];
        let cur = to;
        while (prev.has(cur)) {
          const p = prev.get(cur)!;
          path.push(p);
          cur = p;
        }
        path.reverse();
        return path;
      }
      q.push(w);
    }
  }
  return null;
}
