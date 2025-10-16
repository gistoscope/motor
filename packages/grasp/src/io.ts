import type { GraspId, GraspNode } from './types';
import { makeId, node, edge } from './api';
import { createGraph, addNode, addEdge } from './core';

/** On-wire JSON format for graphs */
export interface GraphJSON {
  nodes: Array<{ id: string; label: string }>;
  edges: Array<{ from: string; to: string; label?: string }>;
}

/** Internal graph shape used by the core */
export type GraspGraph = {
  adj: Map<GraspId, Set<GraspId>>;
  nodes?: Map<GraspId, GraspNode>;
};

// --- deterministic helpers (no external deps) ---
function cmp(a: { toString(): string }, b: { toString(): string }): number {
  return a.toString().localeCompare(b.toString());
}
function sortIds<T extends { toString(): string }>(xs: Iterable<T>): T[] {
  return Array.from(xs).sort(cmp);
}

// --- validation ---
export function validateGraphJSON(j: unknown): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (typeof j !== 'object' || j === null) return { ok: false, errors: ['root must be an object'] };

  const obj = j as Record<string, unknown>;
  const nodes = obj.nodes;
  const edges = obj.edges;

  if (!Array.isArray(nodes)) errors.push('nodes must be an array');
  if (!Array.isArray(edges)) errors.push('edges must be an array');

  const idSet = new Set<string>();
  if (Array.isArray(nodes)) {
    nodes.forEach((n, i) => {
      if (typeof n !== 'object' || n === null) { errors.push(`nodes[${i}] must be object`); return; }
      const { id, label } = n as any;
      if (typeof id !== 'string' || id.trim() === '') errors.push(`nodes[${i}].id must be non-empty string`);
      if (typeof label !== 'string') errors.push(`nodes[${i}].label must be string`);
      if (typeof id === 'string') {
        if (idSet.has(id)) errors.push(`duplicate node id "${id}"`);
        idSet.add(id);
      }
    });
  }

  if (Array.isArray(edges)) {
    edges.forEach((e, i) => {
      if (typeof e !== 'object' || e === null) { errors.push(`edges[${i}] must be object`); return; }
      const { from, to, label } = e as any;
      if (typeof from !== 'string' || from.trim() === '') errors.push(`edges[${i}].from must be non-empty string`);
      if (typeof to   !== 'string' || to.trim()   === '') errors.push(`edges[${i}].to must be non-empty string`);
      if (label !== undefined && typeof label !== 'string') errors.push(`edges[${i}].label must be string if present`);
      if (typeof from === 'string' && !idSet.has(from)) errors.push(`edges[${i}].from references missing node "${from}"`);
      if (typeof to   === 'string' && !idSet.has(to))   errors.push(`edges[${i}].to references missing node "${to}"`);
    });
  }

  return { ok: errors.length === 0, errors };
}

export function assertValidGraphJSON(j: unknown): asserts j is GraphJSON {
  const res = validateGraphJSON(j);
  if (!res.ok) throw new Error('Invalid GraphJSON:\n' + res.errors.map(e => ' - ' + e).join('\n'));
}

// --- I/O ---
export function toJSON(g: GraspGraph): GraphJSON {
  const nodes: GraphJSON['nodes'] = [];
  const edges: GraphJSON['edges'] = [];

  const nodeIds =
    g.nodes && g.nodes.size ? sortIds(g.nodes.keys()) : sortIds(g.adj.keys());

  for (const id of nodeIds) {
    const label = g.nodes?.get(id as GraspId)?.label ?? String(id);
    nodes.push({ id: String(id), label });
  }

  for (const from of sortIds(g.adj.keys())) {
    const tos = g.adj.get(from as GraspId);
    if (!tos) continue;
    for (const to of sortIds(tos)) {
      edges.push({ from: String(from), to: String(to) });
    }
  }

  return { nodes, edges };
}

export function fromJSON(j: unknown): GraspGraph {
  assertValidGraphJSON(j);
  const data = j as GraphJSON;

  const g = createGraph();
  for (const n of data.nodes) {
    const id = makeId(n.id);
    addNode(g, node(id, n.label));
  }
  for (const e of data.edges) {
    const f = makeId(e.from);
    const t = makeId(e.to);
    addEdge(g, edge(f, t, e.label));
  }
  return g;
}
