import type { GraspId } from './types';

export type AttrValue = unknown;

export interface GraspAttrs {
  node: Map<GraspId, Map<string, AttrValue>>;
  edge: Map<string, Map<string, AttrValue>>;
}

export function createAttrs(): GraspAttrs {
  return { node: new Map(), edge: new Map() };
}

export function edgeKey(from: GraspId, to: GraspId): string {
  return `${String(from)}->${String(to)}`;
}

export function setNodeAttr(a: GraspAttrs, id: GraspId, key: string, value: AttrValue): void {
  if (!a.node.has(id)) a.node.set(id, new Map());
  a.node.get(id)!.set(key, value);
}

export function getNodeAttr<T = AttrValue>(a: GraspAttrs, id: GraspId, key: string): T | undefined {
  return a.node.get(id)?.get(key) as T | undefined;
}

export function deleteNodeAttr(a: GraspAttrs, id: GraspId, key: string): boolean {
  const m = a.node.get(id);
  if (!m) return false;
  const ok = m.delete(key);
  if (m.size === 0) a.node.delete(id);
  return ok;
}

export function setEdgeAttr(a: GraspAttrs, from: GraspId, to: GraspId, key: string, value: AttrValue): void {
  const k = edgeKey(from, to);
  if (!a.edge.has(k)) a.edge.set(k, new Map());
  a.edge.get(k)!.set(key, value);
}

export function getEdgeAttr<T = AttrValue>(a: GraspAttrs, from: GraspId, to: GraspId, key: string): T | undefined {
  return a.edge.get(edgeKey(from, to))?.get(key) as T | undefined;
}

export function deleteEdgeAttr(a: GraspAttrs, from: GraspId, to: GraspId, key: string): boolean {
  const k = edgeKey(from, to);
  const m = a.edge.get(k);
  if (!m) return false;
  const ok = m.delete(key);
  if (m.size === 0) a.edge.delete(k);
  return ok;
}

export type GraspGraph = {
  adj: Map<GraspId, Set<GraspId>>;
  nodes?: Map<GraspId, { id: GraspId; label: string }>;
};

export function purgeDanglingAttrs(a: GraspAttrs, g: GraspGraph): void {
  for (const id of Array.from(a.node.keys())) {
    if (!g.adj.has(id)) a.node.delete(id);
  }
  for (const k of Array.from(a.edge.keys())) {
    const [from, to] = k.split('->') as [GraspId, GraspId];
    if (!g.adj.has(from) || !g.adj.get(from)!.has(to)) {
      a.edge.delete(k);
    }
  }
}
