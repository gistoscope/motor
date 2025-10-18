import {
  edges as listEdges,
  hasCycleDirected,
  scc,
  size,
  type GraspGraph,
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
