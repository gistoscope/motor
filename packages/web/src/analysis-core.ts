import {
  edges as listEdges,
  hasCycleDirected,
  scc,
  shortestPath,
  size,
  nodes as listNodes,
  type GraspGraph,
  type GraphJSON,
} from './api';

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
  const nodeIds = listNodes(graph).map((id) => String(id));
  const edges = listEdges(graph).map((edge) => ({
    from: String(edge.from),
    to: String(edge.to),
  }));

  const cycleGraph: GraphJSON = {
    nodes: nodeIds.map((id) => ({ id })),
    edges: edges.map(({ from, to }) => ({ from, to })),
  };

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
    hasCycle: hasCycleDirected(cycleGraph),
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

  const graphView: GraphJSON = {
    nodes: allNodes.map((id) => ({ id })),
    edges: weightedEdges.map(({ from, to, weight }) => ({ from, to, weight })),
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
