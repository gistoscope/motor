import type { GraspId, GraspNode, GraspEdge } from './types';

export type GraspGraph = {
  adj: Map<GraspId, Set<GraspId>>;
  nodes?: Map<GraspId, GraspNode>;
};

export function createGraph(): GraspGraph {
  return { adj: new Map(), nodes: new Map() };
}

export function addNode(g: GraspGraph, n: GraspNode): void {
  if (!g.adj.has(n.id)) g.adj.set(n.id, new Set());
  if (g.nodes instanceof Map && !g.nodes.has(n.id)) {
    g.nodes.set(n.id, n);
  }
}

export function addEdge(g: GraspGraph, e: GraspEdge): void {
  // idempotent
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

export function nodes(g: GraspGraph): GraspId[] {
  if (g.nodes instanceof Map) {
    return Array.from(g.nodes.keys()).sort();
  }
  return Array.from(g.adj.keys()).sort();
}

export function edges(g: GraspGraph): Array<{ from: GraspId; to: GraspId }> {
  const out: Array<{ from: GraspId; to: GraspId }> = [];
  for (const [from, tos] of g.adj) {
    for (const to of tos) out.push({ from, to });
  }
  // keep deterministic order
  out.sort((a, b) => (a.from === b.from ? (a.to < b.to ? -1 : a.to > b.to ? 1 : 0) : (a.from < b.from ? -1 : 1)));
  return out;
}

export function hasEdge(g: GraspGraph, from: GraspId, to: GraspId): boolean {
  return g.adj.get(from)?.has(to) ?? false;
}

export function degree(g: GraspGraph, id: GraspId): { out: number; in: number } {
  const out = g.adj.get(id)?.size ?? 0;
  let inbound = 0;
  for (const [, tos] of g.adj) if (tos.has(id)) inbound++;
  return { out, in: inbound };
}

export function size(g: GraspGraph): { nodes: number; edges: number } {
  let e = 0;
  for (const [, tos] of g.adj) e += tos.size;
  const nodesCount = g.nodes instanceof Map ? g.nodes.size : g.adj.size;
  return { nodes: nodesCount, edges: e };
}

/** Remove a single directed edge; idempotent. Returns true if deletion happened. */
export function removeEdge(g: GraspGraph, from: GraspId, to: GraspId): boolean {
  const set = g.adj.get(from);
  if (!set) return false;
  const existed = set.delete(to);
  if (set.size === 0) g.adj.delete(from);
  return existed;
}

/** Remove node and all incident edges (in & out); idempotent. Returns summary. */
export function removeNode(
  g: GraspGraph,
  id: GraspId,
): { removedNode: boolean; removedOut: number; removedIn: number } {
  // out-edges
  let removedOut = 0;
  const out = g.adj.get(id);
  if (out) {
    removedOut = out.size;
    g.adj.delete(id);
  }

  // in-edges
  let removedIn = 0;
  for (const [from, set] of Array.from(g.adj.entries())) {
    if (set.delete(id)) removedIn++;
    if (set.size === 0) g.adj.delete(from);
  }

  // node map (if present)
  let removedNode = false;
  if (g.nodes instanceof Map) {
    removedNode = g.nodes.delete(id) || false;
  }

  return { removedNode, removedOut, removedIn };
}
