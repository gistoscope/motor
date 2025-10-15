import type { GraspEdge, GraspId, GraspNode } from './types';
import { makeId, node, edge } from './api';
import { createGraph, addNode, addEdge } from './core';

/** Canonical on-wire JSON format for graphs */
export interface GraspDTO {
  nodes: Array<{ id: string; label: string }>;
  edges: Array<{ from: string; to: string; label?: string }>;
}

/** Minimal internal graph view we already use elsewhere */
export type GraspGraph = {
  adj: Map<GraspId, Set<GraspId>>;
  nodes?: Map<GraspId, GraspNode>;
};

/** Validate DTO, return a list of human-readable errors (empty = OK). */
export function validateDTO(dto: unknown): string[] {
  const errors: string[] = [];
  const asObj = dto as Partial<GraspDTO>;
  if (!asObj || typeof asObj !== 'object') return ['DTO is not an object'];

  if (!Array.isArray(asObj.nodes)) errors.push('nodes must be an array');
  if (!Array.isArray(asObj.edges)) errors.push('edges must be an array');
  if (errors.length) return errors;

  const ids = new Set<string>();
  for (const n of asObj.nodes!) {
    if (!n || typeof n !== 'object') { errors.push('node entry is not an object'); continue; }
    if (typeof n.id !== 'string') errors.push('node.id must be string');
    if (typeof n.label !== 'string') errors.push('node.label must be string');
    if (typeof n.id === 'string') {
      if (ids.has(n.id)) errors.push(`duplicate node id: ${n.id}`);
      ids.add(n.id);
    }
  }

  for (const e of asObj.edges!) {
    if (!e || typeof e !== 'object') { errors.push('edge entry is not an object'); continue; }
    if (typeof e.from !== 'string') errors.push('edge.from must be string');
    if (typeof e.to !== 'string') errors.push('edge.to must be string');
    if (typeof e.label !== 'undefined' && typeof e.label !== 'string') {
      errors.push('edge.label must be string when provided');
    }
    if (typeof e.from === 'string' && !ids.has(e.from)) errors.push(`edge.from not found: ${e.from}`);
    if (typeof e.to === 'string' && !ids.has(e.to)) errors.push(`edge.to not found: ${e.to}`);
  }

  return errors;
}

/** Build an internal graph from DTO; throws on validation errors. */
export function fromJSON(dto: GraspDTO) {
  const errs = validateDTO(dto);
  if (errs.length) throw new Error('Invalid GraspDTO:\n - ' + errs.join('\n - '));

  const g = createGraph();
  for (const n of dto.nodes) addNode(g, node(makeId(n.id), n.label));
  for (const e of dto.edges) addEdge(g, edge(makeId(e.from), makeId(e.to), e.label));
  return g;
}

/** Export an internal graph into DTO. */
export function toJSON(g: GraspGraph): GraspDTO {
  // prefer declared nodes map; otherwise infer node set from adjacency
  const nodeEntries: Array<{ id: string; label: string }> = [];
  if (g.nodes && g.nodes.size) {
    for (const n of g.nodes.values()) nodeEntries.push({ id: n.id as unknown as string, label: n.label });
  } else {
    for (const id of g.adj.keys()) nodeEntries.push({ id: id as unknown as string, label: String(id) });
  }

  const edges: Array<{ from: string; to: string; label?: string }> = [];
  for (const [u, nbrs] of g.adj.entries()) {
    for (const v of nbrs) edges.push({ from: u as unknown as string, to: v as unknown as string });
  }

  return { nodes: nodeEntries, edges };
}
