import type { GraspId } from './types';

/**
 * Minimal view of a directed graph compatible with existing helpers:
 * g.adj: Map<node, Set<neighbor>>
 */
export type GraspGraphView = { adj: Map<GraspId, Set<GraspId>> };

/** Weight function: returns non-negative weight for an edge (u -> v). */
export type WeightFn = (from: GraspId, to: GraspId) => number;

/** Result of Dijkstra. distance=+Infinity won't be returned; null means unreachable. */
export interface ShortestResult {
  distance: number;
  path: GraspId[];
}

/**
 * Dijkstra’s algorithm on an unweighted-adjacency view + user-provided weight lookup.
 * Requirements: all weights >= 0; edges not present in g.adj must not be queried.
 */
export function dijkstra(
  g: GraspGraphView,
  from: GraspId,
  to: GraspId,
  weight: WeightFn
): ShortestResult | null {
  if (from === to) return { distance: 0, path: [from] };

  const dist = new Map<GraspId, number>();
  const prev = new Map<GraspId, GraspId>();
  const visited = new Set<GraspId>();

  // Tiny binary-heap-less priority queue (array) for small graphs; keeps diff minimal.
  type QItem = { id: GraspId; d: number };
  const q: QItem[] = [];

  const push = (id: GraspId, d: number) => {
    // Insert sorted by d (stable enough for our sizes)
    let i = q.findIndex(x => d < x.d);
    if (i === -1) i = q.length;
    q.splice(i, 0, { id, d });
  };
  const pop = (): QItem | undefined => q.shift();

  dist.set(from, 0);
  push(from, 0);

  while (q.length) {
    const cur = pop()!;
    if (visited.has(cur.id)) continue;
    visited.add(cur.id);

    if (cur.id === to) {
      // Reconstruct path
      const path: GraspId[] = [to];
      let v = to;
      while (prev.has(v)) {
        const p = prev.get(v)!;
        path.push(p);
        v = p;
      }
      path.reverse();
      return { distance: dist.get(to)!, path };
    }

    const nbrs = g.adj.get(cur.id);
    if (!nbrs) continue;

    for (const w of nbrs) {
      const wgt = weight(cur.id, w);
      if (wgt < 0) {
        throw new Error(`dijkstra: negative weight encountered on edge ${String(cur.id)} -> ${String(w)}`);
      }
      const alt = cur.d + wgt;
      const best = dist.get(w);
      if (best === undefined || alt < best) {
        dist.set(w, alt);
        prev.set(w, cur.id);
        push(w, alt);
      }
    }
  }

  return null; // unreachable
}
