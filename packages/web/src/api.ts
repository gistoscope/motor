// Unified facade for external imports used by the web demo.
export { validateGraphJSON, fromJSON, toDOT, inspect } from '@motor/grasp';

export type GraphJSON = {
  nodes: Array<{ id: string; label?: string }>;
  edges: Array<{ from: string; to: string; label?: string; weight?: number }>;
  name?: string;
};

export function parseGraphJSON(text: string): GraphJSON {
  const j = JSON.parse(text);
  return j as GraphJSON;
}

export function shortestPath(graph: GraphJSON, src: string, dst: string) {
  const nodes = graph?.nodes ?? [];
  const edges = graph?.edges ?? [];
  const S = new Map(
    nodes.map((n) => [n.id, { d: Infinity, p: null as string | null, done: false, w: Infinity }]),
  );
  for (const e of edges) {
    if (!S.has(e.from)) {
      S.set(e.from, { d: Infinity, p: null, done: false, w: Infinity });
    }
    if (!S.has(e.to)) {
      S.set(e.to, { d: Infinity, p: null, done: false, w: Infinity });
    }
  }
  if (!S.has(src) || !S.has(dst)) return { distance: Infinity, path: [] as string[] };
  S.get(src)!.d = 0;
  const adj = new Map<string, Array<{ to: string; w: number }>>();
  for (const e of edges) {
    const w = Math.max(0, Number(e.weight ?? 1));
    const a = adj.get(e.from) ?? [];
    a.push({ to: e.to, w });
    adj.set(e.from, a);
  }
  while (true) {
    let u: string | null = null;
    let best = Infinity;
    for (const [id, st] of S) if (!st.done && st.d < best) { best = st.d; u = id; }
    if (u === null) break;
    if (u === dst) break;
    const Su = S.get(u)!;
    Su.done = true;
    for (const { to, w } of adj.get(u) ?? []) {
      const Sv = S.get(to);
      if (!Sv) continue;
      const nd = Su.d + w;
      const shouldUpdate =
        nd < Sv.d ||
        (nd === Sv.d &&
          (w < Sv.w || (w === Sv.w && (Sv.p === null || (u ?? '').localeCompare(Sv.p) < 0))));
      if (shouldUpdate) {
        Sv.d = nd;
        Sv.p = u;
        Sv.w = w;
      }
  }
  }
  const path: string[] = [];
  if (S.get(dst)!.d !== Infinity) {
    let cur: string | null = dst;
    while (cur) {
      path.push(cur);
      cur = S.get(cur)!.p;
    }
    path.reverse();
  }
  return { distance: S.get(dst)!.d, path };
}

export function hasCycleDirected(graph: GraphJSON): boolean {
  const nodeSet = new Set((graph?.nodes ?? []).map((n) => n.id));
  for (const e of graph?.edges ?? []) {
    nodeSet.add(e.from);
    nodeSet.add(e.to);
  }
  const nodes = Array.from(nodeSet);
  const indeg = new Map(nodes.map((id) => [id, 0]));
  for (const e of graph?.edges ?? []) {
    indeg.set(e.to, (indeg.get(e.to) || 0) + 1);
  }
  const q = nodes.filter((id) => (indeg.get(id) || 0) === 0);
  let seen = 0;
  while (q.length) {
    const u = q.shift()!;
    seen++;
    for (const e of graph?.edges ?? []) if (e.from === u) {
      indeg.set(e.to, (indeg.get(e.to) || 0) - 1);
      if ((indeg.get(e.to) || 0) === 0) q.push(e.to);
    }
  }
  return seen !== nodes.length;
}
