import {
  edges as listEdges,
  hasCycleDirected,
  scc,
  size,
  nodes as listNodes,
  makeId,
  dijkstra,
  type GraspGraph,
  type GraspId,
} from '@motor/grasp';

const EDGE_KEY_SEPARATOR = '\u2192';

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

export function analyzeGraph(graph: GraspGraph): GraphAnalysis {
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

function ensureDeterministicAdjacency(graph: GraspGraph): Map<GraspId, Set<GraspId>> {
  const adjacency = new Map<GraspId, Set<GraspId>>();
  const nodes = listNodes(graph);
  nodes.forEach((id) => {
    adjacency.set(id, new Set());
  });

  const edges = listEdges(graph)
    .map((edge) => ({
      from: edge.from,
      to: edge.to,
      key: edgeKey(String(edge.from), String(edge.to)),
      fromLabel: String(edge.from),
      toLabel: String(edge.to),
    }))
    .sort((a, b) => {
      if (a.fromLabel === b.fromLabel) {
        return a.toLabel.localeCompare(b.toLabel);
      }
      return a.fromLabel.localeCompare(b.fromLabel);
    });

  edges.forEach((entry) => {
    if (!adjacency.has(entry.from)) {
      adjacency.set(entry.from, new Set());
    }
    if (!adjacency.has(entry.to)) {
      adjacency.set(entry.to, new Set());
    }
    adjacency.get(entry.from)!.add(entry.to);
  });

  return adjacency;
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

export function computeShortestPath(
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

  const adjacency = ensureDeterministicAdjacency(graph);
  const source = makeId(sourceId);
  const target = makeId(targetId);

  if (!adjacency.has(source) || !adjacency.has(target)) {
    return null;
  }

  if (source === target) {
    return { totalWeight: 0, nodes: [sourceId], edges: [] };
  }

  const view = { adj: adjacency };
  const result = dijkstra(view, source, target, (from, to) => {
    const key = edgeKey(String(from), String(to));
    const value = weights.get(key);
    if (value === undefined) {
      throw new Error(`computeShortestPath: missing weight for edge ${key}`);
    }
    return value;
  });

  if (!result) {
    return null;
  }

  const nodes = result.path.map((id) => String(id));
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
