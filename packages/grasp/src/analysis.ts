// packages/grasp/src/analysis.ts
import type { GraspId } from './types';

type AnyGraph = Record<string, unknown>;

/** Унифицированный доступ к исходящим соседям: adj Map, edges[], либо g.outNeighbors(id). */
function outNeighbors(g: AnyGraph, id: GraspId): GraspId[] {
  const adj = (g as any)?.adj;
  if (adj instanceof Map) {
    const set = adj.get(id);
    return set ? Array.from(set) : [];
  }
  const edges = (g as any)?.edges;
  if (Array.isArray(edges)) {
    return edges.filter((e: any) => e?.from === id).map((e: any) => e.to);
  }
  const fn = (g as any)?.outNeighbors;
  if (typeof fn === 'function') {
    return fn(id) ?? [];
  }
  return [];
}

/** Унифицированный доступ к входящим соседям. */
function inNeighbors(g: AnyGraph, id: GraspId): GraspId[] {
  const adj = (g as any)?.adj;
  if (adj instanceof Map) {
    const ins: GraspId[] = [];
    for (const [u, set] of adj as Map<GraspId, Set<GraspId>>) {
      if (set?.has(id)) ins.push(u);
    }
    return ins;
  }
  const edges = (g as any)?.edges;
  if (Array.isArray(edges)) {
    return edges.filter((e: any) => e?.to === id).map((e: any) => e.from);
  }
  // нет явной структуры → восстанавливать нельзя
  return [];
}

/** Обнаружение цикла в ориентированном графе (DFS color-marking). */
export function hasCycleDirected(g: AnyGraph): boolean {
  const GRAY = 1, BLACK = 2;
  const color = new Map<GraspId, number>();

  // соберём все вершины, которые встречаются в рёбрах/adj
  const vertices = new Set<GraspId>();
  // из adj
  const adj = (g as any)?.adj;
  if (adj instanceof Map) {
    for (const [u, set] of adj as Map<GraspId, Set<GraspId>>) {
      vertices.add(u);
      for (const v of set) vertices.add(v);
    }
  }
  // из edges
  const edges = (g as any)?.edges;
  if (Array.isArray(edges)) {
    for (const e of edges) {
      if (e?.from) vertices.add(e.from);
      if (e?.to) vertices.add(e.to);
    }
  }

  const stack: GraspId[] = [];

  function dfs(u: GraspId): boolean {
    color.set(u, GRAY);
    stack.push(u);
    for (const v of outNeighbors(g, u)) {
      const c = color.get(v) ?? 0;
      if (c === GRAY) return true;  // обратное ребро → цикл
      if (c === 0 && dfs(v)) return true;
    }
    stack.pop();
    color.set(u, BLACK);
    return false;
    }

  for (const u of vertices) {
    if ((color.get(u) ?? 0) === 0) {
      if (dfs(u)) return true;
    }
  }
  return false;
}

/** Топологическая сортировка (Kahn). Возвращает null при наличии цикла. */
export function topoSort(g: AnyGraph): GraspId[] | null {
  const indeg = new Map<GraspId, number>();
  const verts = new Set<GraspId>();

  // собрать вершины и посчитать входящие степени
  const adj = (g as any)?.adj;
  if (adj instanceof Map) {
    for (const [u, set] of adj as Map<GraspId, Set<GraspId>>) {
      verts.add(u);
      for (const v of set) {
        verts.add(v);
        indeg.set(v, (indeg.get(v) ?? 0) + 1);
        indeg.set(u, indeg.get(u) ?? 0);
      }
    }
  }
  const edges = (g as any)?.edges;
  if (Array.isArray(edges)) {
    for (const e of edges as any[]) {
      const u = e?.from, v = e?.to;
      if (u == null || v == null) continue;
      verts.add(u); verts.add(v);
      indeg.set(v, (indeg.get(v) ?? 0) + 1);
      indeg.set(u, indeg.get(u) ?? 0);
    }
  }

  const q: GraspId[] = Array.from(verts).filter(v => (indeg.get(v) ?? 0) === 0);
  const order: GraspId[] = [];
  while (q.length) {
    const u = q.shift()!;
    order.push(u);
    for (const v of outNeighbors(g, u)) {
      indeg.set(v, (indeg.get(v) ?? 0) - 1);
      if ((indeg.get(v) ?? 0) === 0) q.push(v);
    }
  }
  return order.length === verts.size ? order : null;
}

/** SCC (Kosaraju): сначала порядок выхода в DFS, затем обход rG. */
export function scc(g: AnyGraph): GraspId[][] {
  const seen = new Set<GraspId>();
  const order: GraspId[] = [];

  // собрать вершины
  const verts = new Set<GraspId>();
  const adj = (g as any)?.adj;
  if (adj instanceof Map) {
    for (const [u, set] of adj as Map<GraspId, Set<GraspId>>) {
      verts.add(u); for (const v of set) verts.add(v);
    }
  }
  const edges = (g as any)?.edges;
  if (Array.isArray(edges)) {
    for (const e of edges as any[]) { if (e?.from) verts.add(e.from); if (e?.to) verts.add(e.to); }
  }

  function dfs1(u: GraspId) {
    seen.add(u);
    for (const v of outNeighbors(g, u)) if (!seen.has(v)) dfs1(v);
    order.push(u);
  }
  for (const v of verts) if (!seen.has(v)) dfs1(v);

  const comp: GraspId[][] = [];
  const seen2 = new Set<GraspId>();
  function dfs2(u: GraspId, bucket: GraspId[]) {
    seen2.add(u); bucket.push(u);
    for (const v of inNeighbors(g, u)) if (!seen2.has(v)) dfs2(v, bucket);
  }
  for (let i = order.length - 1; i >= 0; i--) {
    const v = order[i];
    if (!seen2.has(v)) {
      const bucket: GraspId[] = [];
      dfs2(v, bucket);
      comp.push(bucket);
    }
  }
  return comp;
}

