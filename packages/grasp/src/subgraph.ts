import type { GraspId } from './types';

export type GraspGraph = {
  adj: Map<GraspId, Set<GraspId>>;
  nodes?: Map<GraspId, { id: GraspId; label: string }>;
};

function cloneEmpty(g: GraspGraph): GraspGraph {
  return { adj: new Map(), nodes: g.nodes ? new Map() : undefined };
}

export function inducedSubgraph(g: GraspGraph, ids: GraspId[]): GraspGraph {
  const keep = new Set(ids);
  const out: GraspGraph = cloneEmpty(g);
  // nodes
  if (g.nodes && out.nodes) {
    for (const id of keep) {
      const n = g.nodes.get(id);
      if (n) out.nodes.set(id, { id: n.id, label: n.label });
    }
  }
  // edges (only between kept nodes)
  for (const [u, nbrs] of g.adj) {
    if (!keep.has(u)) continue;
    for (const v of nbrs) {
      if (!keep.has(v)) continue;
      if (!out.adj.has(u)) out.adj.set(u, new Set());
      out.adj.get(u)!.add(v);
    }
  }
  return out;
}

export function filterNodes(g: GraspGraph, pred: (id: GraspId) => boolean): GraspGraph {
  const ids: GraspId[] = [];
  for (const id of g.adj.keys()) if (pred(id)) ids.push(id);
  return inducedSubgraph(g, ids);
}

export function filterEdges(
  g: GraspGraph,
  pred: (from: GraspId, to: GraspId) => boolean
): GraspGraph {
  const out: GraspGraph = { adj: new Map(), nodes: g.nodes ? new Map() : undefined };
  if (g.nodes && out.nodes) {
    for (const [id, n] of g.nodes) out.nodes.set(id, { id: n.id, label: n.label });
  }
  for (const [u, nbrs] of g.adj) {
    for (const v of nbrs) {
      if (!pred(u, v)) continue;
      if (!out.adj.has(u)) out.adj.set(u, new Set());
      out.adj.get(u)!.add(v);
    }
  }
  return out;
}
