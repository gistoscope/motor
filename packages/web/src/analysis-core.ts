import {
  edges as listEdges,
  hasCycleDirected,
  scc,
  size,
  nodes as listNodes,
  type GraspGraph,
} from '@motor/grasp';

export const EDGE_KEY_SEPARATOR = '\u2192';

export type EdgeKey = string;

export interface GraphAnalysis {
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly hasCycle: boolean;
  readonly sccCount: number;
  readonly components: readonly string[][];
  readonly componentIndex: ReadonlyMap<string, number>;
  readonly cyclicComponents: ReadonlySet<number>;
  readonly cycleEdgeCount: number;
  readonly cycleEdgeKeys: ReadonlySet<EdgeKey>;
}

export interface ShortestPathEdge {
  readonly from: string;
  readonly to: string;
}

export interface ShortestPathResult {
  readonly totalWeight: number;
  readonly nodes: readonly string[];
  readonly edges: readonly ShortestPathEdge[];
}

export interface ShortestPathGraphNode {
  readonly id: string;
}

export interface ShortestPathGraphEdge {
  readonly from: string;
  readonly to: string;
  readonly weight?: number | null;
}

export interface ShortestPathGraph {
  readonly nodes?: readonly ShortestPathGraphNode[] | null;
  readonly edges?: readonly ShortestPathGraphEdge[] | null;
}

export interface ShortestPathComputation {
  readonly distance: number;
  readonly path: readonly string[];
}

export function shortestPath(
  graph: ShortestPathGraph | null | undefined,
  src: string,
  dst: string,
): ShortestPathComputation {
  const nodes = graph?.nodes ?? [];
  const edges = graph?.edges ?? [];
  const state = new Map(
    nodes.map((node) => [
      node.id,
      {
        d: node.id === src ? 0 : Number.POSITIVE_INFINITY,
        p: null as string | null,
        done: false,
        w: Number.POSITIVE_INFINITY,
      },
    ]),
  );

  if (!state.has(src) || !state.has(dst)) {
    return { distance: Number.POSITIVE_INFINITY, path: [] };
  }

  const adjacency = new Map<string, Array<{ to: string; w: number }>>();
  for (const edge of edges) {
    const weight = Math.max(0, Number(edge.weight ?? 1));
    if (!Number.isFinite(weight)) {
      continue;
    }
    const bucket = adjacency.get(edge.from);
    const next = { to: edge.to, w: weight };
    if (bucket) {
      bucket.push(next);
    } else {
      adjacency.set(edge.from, [next]);
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

    const sourceState = state.get(candidate)!;
    sourceState.done = true;
    for (const { to, w } of adjacency.get(candidate) ?? []) {
      const targetState = state.get(to);
      if (!targetState) {
        continue;
      }
      const distance = sourceState.d + w;
      const previousWeight = targetState.w;
      const shouldUpdate =
        distance < targetState.d ||
        (distance === targetState.d &&
          (w < previousWeight ||
            (w === previousWeight &&
              (targetState.p === null || candidate.localeCompare(targetState.p) < 0))));

      if (shouldUpdate) {
        targetState.d = distance;
        targetState.p = candidate;
        targetState.w = w;
      }
    }
  }

  const distance = state.get(dst)!.d;
  if (!Number.isFinite(distance)) {
    return { distance, path: [] };
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

export function edgeKey(from: string, to: string): EdgeKey {
  return `${from}${EDGE_KEY_SEPARATOR}${to}`;
}

function normalizeComponent(component: readonly unknown[]): string[] {
  return component.map((id) => String(id)).sort();
}

function sortComponents(components: string[][]): string[][] {
  const entries = components.map((nodes) => ({
    nodes,
    key: `${String(nodes.length).padStart(6, '0')}|${nodes.join('\u0001')}`,
  }));

  entries.sort((a, b) => {
    if (a.key < b.key) return -1;
    if (a.key > b.key) return 1;
    return 0;
  });

  return entries.map((entry) => entry.nodes);
}

export function analyzeGraphSync(graph: GraspGraph): GraphAnalysis {
  const { nodes: nodeCount, edges: edgeCount } = size(graph);
  const edges = listEdges(graph).map((edge) => ({
    from: String(edge.from),
    to: String(edge.to),
  }));

  const componentsRaw = scc(graph);
  const normalized = componentsRaw.map(normalizeComponent);
  const sorted = sortComponents(normalized);

  const componentIndex = new Map<string, number>();
  sorted.forEach((component, index) => {
    component.forEach((nodeId) => {
      componentIndex.set(nodeId, index);
    });
  });

  const selfLoopNodes = new Set<string>();
  edges.forEach(({ from, to }) => {
    if (from === to) {
      selfLoopNodes.add(from);
    }
  });

  const cyclicComponents = new Set<number>();
  sorted.forEach((component, index) => {
    if (component.length > 1) {
      cyclicComponents.add(index);
      return;
    }
    if (component.length === 1 && selfLoopNodes.has(component[0])) {
      cyclicComponents.add(index);
    }
  });

  const cycleEdgeKeys = new Set<EdgeKey>();
  let cycleEdgeCount = 0;
  edges.forEach(({ from, to }) => {
    const fromIndex = componentIndex.get(from);
    const toIndex = componentIndex.get(to);
    if (
      fromIndex !== undefined &&
      toIndex !== undefined &&
      fromIndex === toIndex &&
      cyclicComponents.has(fromIndex)
    ) {
      cycleEdgeKeys.add(edgeKey(from, to));
      cycleEdgeCount += 1;
    }
  });

  return {
    nodeCount,
    edgeCount,
    hasCycle: hasCycleDirected(graph),
    sccCount: sorted.length,
    components: sorted,
    componentIndex,
    cyclicComponents,
    cycleEdgeCount,
    cycleEdgeKeys,
  };
}

function resolveWeightMap(graph: GraspGraph): ReadonlyMap<EdgeKey, number> | null {
  const weights = (graph as { weights?: ReadonlyMap<EdgeKey, number> | undefined }).weights;
  if (!weights || weights.size === 0) {
    return null;
  }

  for (const { from, to } of listEdges(graph)) {
    const key = edgeKey(String(from), String(to));
    const weight = weights.get(key);
    if (weight === undefined || Number.isNaN(weight) || !Number.isFinite(weight) || weight < 0) {
      return null;
    }
  }

  return weights;
}

export function computeShortestPathSync(
  graph: GraspGraph,
  sourceId: string,
  targetId: string,
): ShortestPathResult | null {
  if (!sourceId || !targetId) {
    return null;
  }

  const weights = resolveWeightMap(graph);
  if (!weights) {
    return null;
  }

  const allNodes = listNodes(graph).map((id) => String(id));
  const nodeSet = new Set(allNodes);

  if (!nodeSet.has(sourceId) || !nodeSet.has(targetId)) {
    return null;
  }

  if (sourceId === targetId) {
    return { totalWeight: 0, nodes: [sourceId], edges: [] };
  }

  const weightedEdges = listEdges(graph)
    .map((edge) => {
      const from = String(edge.from);
      const to = String(edge.to);
      const key = edgeKey(from, to);
      const value = weights.get(key);
      if (value === undefined) {
        throw new Error(`computeShortestPath: missing weight for edge ${key}`);
      }
      return { from, to, weight: value };
    })
    .sort((a, b) => {
      if (a.from === b.from) {
        return a.to.localeCompare(b.to);
      }
      return a.from.localeCompare(b.from);
    });

  const graphView: ShortestPathGraph = {
    nodes: allNodes.map((id) => ({ id })),
    edges: weightedEdges,
  };

  const result = shortestPath(graphView, sourceId, targetId);

  if (!Number.isFinite(result.distance) || result.path.length === 0) {
    return null;
  }

  const nodes = [...result.path];
  const edges: ShortestPathEdge[] = [];
  for (let index = 0; index < nodes.length - 1; index += 1) {
    edges.push({ from: nodes[index], to: nodes[index + 1] });
  }

  return {
    totalWeight: result.distance,
    nodes,
    edges,
  };
}
