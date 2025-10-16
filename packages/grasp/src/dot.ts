import type { GraspId, GraspNode } from './types';

export type GraspGraph = {
  adj: Map<GraspId, Set<GraspId>>;
  nodes?: Map<GraspId, GraspNode>;
};

function cmp(a: { toString(): string }, b: { toString(): string }): number {
  return a.toString().localeCompare(b.toString());
}
function sortIds<T extends { toString(): string }>(xs: Iterable<T>): T[] {
  return Array.from(xs).sort(cmp);
}
function esc(s: unknown): string {
  return String(s).replace(/"/g, '\\"');
}

/** Export graph to Graphviz DOT (directed). Deterministic ordering. */
export function toDOT(g: GraspGraph, opts?: { graphName?: string }): string {
  const name = opts?.graphName ?? 'G';
  const lines: string[] = [];
  lines.push(`digraph ${name} {`);

  // Nodes: from declared nodes map, else from adjacency keys
  const nodeIds =
    g.nodes && g.nodes.size ? sortIds(g.nodes.keys()) : sortIds(g.adj.keys());
  for (const id of nodeIds) {
    const label = g.nodes?.get(id as GraspId)?.label ?? String(id);
    lines.push(`  "${esc(id)}" [label="${esc(label)}"];`);
  }

  // Edges
  for (const from of sortIds(g.adj.keys())) {
    const tos = g.adj.get(from as GraspId);
    if (!tos) continue;
    for (const to of sortIds(tos)) {
      lines.push(`  "${esc(from)}" -> "${esc(to)}";`);
    }
  }

  lines.push('}');
  return lines.join('\n');
}
