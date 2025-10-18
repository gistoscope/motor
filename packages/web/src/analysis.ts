import { edges as listEdges, scc as graspScc, type GraspGraph } from '@motor/grasp';

const EDGE_KEY_SEPARATOR = '\u0000';

export interface SCCComponent {
  index: number;
  nodes: string[];
  representative: string;
}

export interface SCCAnalysis {
  components: SCCComponent[];
  nodeToComponent: Map<string, number>;
  componentCount: number;
  hasCycle: boolean;
}

export interface CycleAnalysis {
  edgeKeys: Set<string>;
}

export function makeEdgeKey(from: string, to: string): string {
  return `${from}${EDGE_KEY_SEPARATOR}${to}`;
}

export function extractEdge(key: string): { from: string; to: string } {
  const [from, to] = key.split(EDGE_KEY_SEPARATOR);
  return { from: from ?? '', to: to ?? '' };
}

function compareIds(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

export function computeSCC(graph: GraspGraph): SCCAnalysis {
  const raw = graspScc(graph);
  const components = raw
    .map((component) => component.map((id) => String(id)).sort(compareIds))
    .sort((a, b) => {
      const left = a[0] ?? '';
      const right = b[0] ?? '';
      return compareIds(left, right);
    });

  const nodeToComponent = new Map<string, number>();
  const normalized: SCCComponent[] = components.map((nodes, index) => {
    nodes.forEach((nodeId) => nodeToComponent.set(nodeId, index));
    return {
      index,
      nodes,
      representative: nodes[0] ?? '',
    };
  });

  let hasCycle = normalized.some((component) => component.nodes.length > 1);
  if (!hasCycle) {
    for (const edge of listEdges(graph)) {
      const fromId = String(edge.from);
      const toId = String(edge.to);
      if (fromId === toId) {
        hasCycle = true;
        break;
      }
    }
  }

  return {
    components: normalized,
    nodeToComponent,
    componentCount: normalized.length,
    hasCycle,
  };
}

export function findCycles(graph: GraspGraph, base?: SCCAnalysis): CycleAnalysis {
  const scc = base ?? computeSCC(graph);
  const cyclicComponentIndexes = new Set<number>();
  for (const component of scc.components) {
    if (component.nodes.length > 1) {
      cyclicComponentIndexes.add(component.index);
    }
  }

  const cycleEdges = new Set<string>();
  for (const edge of listEdges(graph)) {
    const fromId = String(edge.from);
    const toId = String(edge.to);

    if (fromId === toId) {
      cycleEdges.add(makeEdgeKey(fromId, toId));
      continue;
    }

    const fromComponent = scc.nodeToComponent.get(fromId);
    const toComponent = scc.nodeToComponent.get(toId);
    if (
      fromComponent != null &&
      toComponent != null &&
      fromComponent === toComponent &&
      cyclicComponentIndexes.has(fromComponent)
    ) {
      cycleEdges.add(makeEdgeKey(fromId, toId));
    }
  }

  return { edgeKeys: cycleEdges };
}
