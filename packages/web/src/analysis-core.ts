import { hasCycleDirected, shortestPath, type GraphJSON } from './api';

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

interface GraphLikeNode {
  readonly id?: unknown;
  readonly label?: unknown;
}

interface GraphLikeEdge {
  readonly from?: unknown;
  readonly to?: unknown;
  readonly label?: unknown;
  readonly weight?: unknown;
}

interface GraphLike {
  readonly nodes?: readonly GraphLikeNode[] | null;
  readonly edges?: readonly GraphLikeEdge[] | null;
}

function toGraphJSON(graph: GraphJSON | GraphLike | null | undefined): GraphJSON {
  const normalizedNodes: GraphJSON['nodes'] = [];
  const normalizedEdges: GraphJSON['edges'] = [];

  const seenNodes = new Set<string>();
  const sourceNodes = graph?.nodes ?? [];
  for (const node of sourceNodes ?? []) {
    if (!node) continue;
    const idRaw = (node as GraphLikeNode).id;
    if (idRaw == null) continue;
    const id = String(idRaw);
    if (seenNodes.has(id)) continue;
    seenNodes.add(id);
    const labelRaw = (node as GraphLikeNode).label;
    const label = typeof labelRaw === 'string' ? labelRaw : undefined;
    const entry: GraphJSON['nodes'][number] = label === undefined ? { id } : { id, label };
    normalizedNodes.push(entry);
  }

  const sourceEdges = graph?.edges ?? [];
  for (const edge of sourceEdges ?? []) {
    if (!edge) continue;
    const fromRaw = (edge as GraphLikeEdge).from;
    const toRaw = (edge as GraphLikeEdge).to;
    if (fromRaw == null || toRaw == null) continue;
    const from = String(fromRaw);
    const to = String(toRaw);
    const labelRaw = (edge as GraphLikeEdge).label;
    const weightRaw = (edge as GraphLikeEdge).weight;
    const label = typeof labelRaw === 'string' ? labelRaw : undefined;
    const weight =
      typeof weightRaw === 'number' && Number.isFinite(weightRaw) && weightRaw >= 0
        ? weightRaw
        : undefined;
    const entry: GraphJSON['edges'][number] = {
      from,
      to,
      ...(label === undefined ? {} : { label }),
      ...(weight === undefined ? {} : { weight }),
    };
    normalizedEdges.push(entry);
    if (!seenNodes.has(from)) {
      seenNodes.add(from);
      normalizedNodes.push({ id: from });
    }
    if (!seenNodes.has(to)) {
      seenNodes.add(to);
      normalizedNodes.push({ id: to });
    }
  }

  return { nodes: normalizedNodes, edges: normalizedEdges };
}

function collectNodeIds(graph: GraphJSON): string[] {
  const ids = new Set<string>();
  for (const node of graph.nodes ?? []) {
    if (!node) continue;
    ids.add(String(node.id));
  }
  for (const edge of graph.edges ?? []) {
    if (!edge) continue;
    ids.add(String(edge.from));
    ids.add(String(edge.to));
  }
  return Array.from(ids);
}

function buildAdjacency(graph: GraphJSON): {
  readonly forward: Map<string, string[]>;
  readonly reverse: Map<string, string[]>;
} {
  const forward = new Map<string, string[]>();
  const reverse = new Map<string, string[]>();
  const nodes = collectNodeIds(graph);
  nodes.forEach((id) => {
    forward.set(id, []);
    reverse.set(id, []);
  });
  for (const edge of graph.edges ?? []) {
    if (!edge) continue;
    const from = String(edge.from);
    const to = String(edge.to);
    if (!forward.has(from)) {
      forward.set(from, []);
    }
    if (!forward.has(to)) {
      forward.set(to, []);
    }
    if (!reverse.has(from)) {
      reverse.set(from, []);
    }
    if (!reverse.has(to)) {
      reverse.set(to, []);
    }
    forward.get(from)!.push(to);
    reverse.get(to)!.push(from);
  }
  return { forward, reverse };
}

function computeScc(graph: GraphJSON): string[][] {
  const nodes = collectNodeIds(graph);
  if (nodes.length === 0) {
    return [];
  }
  const { forward, reverse } = buildAdjacency(graph);
  const visited = new Set<string>();
  const order: string[] = [];
  const visitForward = (node: string) => {
    visited.add(node);
    for (const next of forward.get(node) ?? []) {
      if (!visited.has(next)) {
        visitForward(next);
      }
    }
    order.push(node);
  };
  nodes.forEach((node) => {
    if (!visited.has(node)) {
      visitForward(node);
    }
  });
  const assigned = new Set<string>();
  const components: string[][] = [];
  const visitReverse = (node: string, bucket: string[]) => {
    assigned.add(node);
    bucket.push(node);
    for (const prev of reverse.get(node) ?? []) {
      if (!assigned.has(prev)) {
        visitReverse(prev, bucket);
      }
    }
  };
  for (let index = order.length - 1; index >= 0; index -= 1) {
    const node = order[index];
    if (assigned.has(node)) {
      continue;
    }
    const bucket: string[] = [];
    visitReverse(node, bucket);
    components.push(bucket.map((id) => String(id)).sort());
  }
  components.sort((a, b) => {
    if (a.length !== b.length) {
      return a.length - b.length;
    }
    const aKey = a.join('\u0001');
    const bKey = b.join('\u0001');
    return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
  });
  return components;
}

export function analyzeGraphSync(graph: GraphJSON | GraphLike | null | undefined): GraphAnalysis {
  const normalized = toGraphJSON(graph);
  const nodes = collectNodeIds(normalized);
  const edges = normalized.edges ?? [];
  const components = computeScc(normalized);
  const componentIndex = new Map<string, number>();
  components.forEach((component, index) => {
    component.forEach((id) => {
      componentIndex.set(id, index);
    });
  });
  const selfLoopNodes = new Set<string>();
  edges.forEach((edge) => {
    if (!edge) return;
    const from = String(edge.from);
    const to = String(edge.to);
    if (from === to) {
      selfLoopNodes.add(from);
    }
  });
  const cyclicComponents = new Set<number>();
  components.forEach((component, index) => {
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
  edges.forEach((edge) => {
    if (!edge) return;
    const from = String(edge.from);
    const to = String(edge.to);
    const fromIndex = componentIndex.get(from);
    const toIndex = componentIndex.get(to);
    if (fromIndex === undefined || toIndex === undefined) {
      return;
    }
    if (fromIndex === toIndex && cyclicComponents.has(fromIndex)) {
      cycleEdgeKeys.add(edgeKey(from, to));
      cycleEdgeCount += 1;
    }
  });
  return {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    hasCycle: hasCycleDirected(normalized),
    sccCount: components.length,
    components,
    componentIndex,
    cyclicComponents,
    cycleEdgeCount,
    cycleEdgeKeys,
  };
}

export function edgeKey(from: string, to: string): EdgeKey {
  return `${from}${EDGE_KEY_SEPARATOR}${to}`;
}

export function computeShortestPathSync(
  graph: GraphJSON | GraphLike | null | undefined,
  sourceId: string,
  targetId: string,
): ShortestPathResult | null {
  if (!sourceId || !targetId) {
    return null;
  }
  const normalized = toGraphJSON(graph);
  const nodeIds = new Set(normalized.nodes.map((node) => node.id));
  if (!nodeIds.has(sourceId) || !nodeIds.has(targetId)) {
    return null;
  }
  const result = shortestPath(normalized, sourceId, targetId);
  if (!Number.isFinite(result.distance) || result.path.length === 0) {
    return null;
  }
  const nodes = [...result.path];
  const edges: ShortestPathEdge[] = [];
  for (let index = 0; index < nodes.length - 1; index += 1) {
    edges.push({ from: nodes[index], to: nodes[index + 1] });
  }
  return { totalWeight: result.distance, nodes, edges };
}
