import {
  edges,
  fromJSON,
  inspect,
  nodes,
  scc,
  size,
  toDOT,
  validateGraphJSON,
  type GraspGraph,
} from '@motor/grasp';

export { edges, fromJSON, inspect, nodes, scc, size, toDOT, validateGraphJSON };
export type { GraspGraph };

export type GraphJSON = {
  nodes: Array<{ id: string; label?: string }>;
  edges: Array<{ from: string; to: string; label?: string; weight?: number }>;
  name?: string;
};

type ShortestPathState = {
  d: number;
  p: string | null;
  done: boolean;
  w: number;
};

function normalizeGraphJSON(graph: GraphJSON | null | undefined) {
  const nodes = graph?.nodes ?? [];
  const edges = graph?.edges ?? [];
  const state = new Map<string, ShortestPathState>();

  for (const node of nodes) {
    const id = String(node.id);
    if (!state.has(id)) {
      state.set(id, { d: Number.POSITIVE_INFINITY, p: null, done: false, w: Number.POSITIVE_INFINITY });
    }
  }

  for (const edge of edges) {
    const from = String(edge.from);
    const to = String(edge.to);
    if (!state.has(from)) {
      state.set(from, { d: Number.POSITIVE_INFINITY, p: null, done: false, w: Number.POSITIVE_INFINITY });
    }
    if (!state.has(to)) {
      state.set(to, { d: Number.POSITIVE_INFINITY, p: null, done: false, w: Number.POSITIVE_INFINITY });
    }
  }

  return { state, edges };
}

export function parseGraphJSON(text: string): GraphJSON {
  const parsed = JSON.parse(text) as GraphJSON;
  return parsed;
}

export function shortestPath(graph: GraphJSON | null | undefined, src: string, dst: string) {
  const { state, edges } = normalizeGraphJSON(graph);
  if (!state.has(src) || !state.has(dst)) {
    return { distance: Number.POSITIVE_INFINITY, path: [] as string[] };
  }

  state.get(src)!.d = 0;

  const adjacency = new Map<string, Array<{ to: string; w: number }>>();
  for (const edge of edges) {
    const from = String(edge.from);
    const to = String(edge.to);
    const weightRaw = Number(edge.weight ?? 1);
    if (!Number.isFinite(weightRaw)) {
      continue;
    }
    const weight = Math.max(0, weightRaw);
    const bucket = adjacency.get(from);
    const entry = { to, w: weight };
    if (bucket) {
      bucket.push(entry);
    } else {
      adjacency.set(from, [entry]);
    }
  }

  while (true) {
    let candidate: string | null = null;
    let best = Number.POSITIVE_INFINITY;

    for (const [id, info] of state) {
      if (!info.done && info.d < best) {
        best = info.d;
        candidate = id;
      }
    }

    if (candidate === null || candidate === dst) {
      break;
    }

    const candidateState = state.get(candidate)!;
    candidateState.done = true;

    for (const { to, w } of adjacency.get(candidate) ?? []) {
      const targetState = state.get(to);
      if (!targetState) {
        continue;
      }
      const distance = candidateState.d + w;
      const shouldUpdate =
        distance < targetState.d ||
        (distance === targetState.d &&
          (w < targetState.w || (w === targetState.w && (targetState.p === null || candidate.localeCompare(targetState.p) < 0))));

      if (shouldUpdate) {
        targetState.d = distance;
        targetState.p = candidate;
        targetState.w = w;
      }
    }
  }

  const destinationState = state.get(dst)!;
  const distance = destinationState.d;
  if (!Number.isFinite(distance)) {
    return { distance, path: [] as string[] };
  }

  const path: string[] = [];
  let current: string | null = dst;
  while (current) {
    path.push(current);
    current = state.get(current)!.p;
  }
  path.reverse();

  return { distance, path };
}

export function hasCycleDirected(graph: GraphJSON | null | undefined): boolean {
  const nodes = graph?.nodes ?? [];
  const edges = graph?.edges ?? [];
  const indegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const node of nodes) {
    const id = String(node.id);
    if (!indegree.has(id)) {
      indegree.set(id, 0);
    }
  }

  for (const edge of edges) {
    const from = String(edge.from);
    const to = String(edge.to);
    if (!indegree.has(from)) {
      indegree.set(from, 0);
    }
    indegree.set(to, (indegree.get(to) ?? 0) + 1);
    const bucket = adjacency.get(from);
    if (bucket) {
      bucket.push(to);
    } else {
      adjacency.set(from, [to]);
    }
    if (!indegree.has(to)) {
      indegree.set(to, 0);
    }
  }

  const queue: string[] = [];
  for (const [id, degree] of indegree) {
    if (degree === 0) {
      queue.push(id);
    }
  }

  let visited = 0;
  while (queue.length > 0) {
    const id = queue.shift()!;
    visited += 1;
    for (const to of adjacency.get(id) ?? []) {
      const nextDegree = (indegree.get(to) ?? 0) - 1;
      indegree.set(to, nextDegree);
      if (nextDegree === 0) {
        queue.push(to);
      }
    }
  }

  return visited !== indegree.size;
}
