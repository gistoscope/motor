import type { GraphEdge, GraphJSON, GraphNode, GraphValidationResult } from './types';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isGraphNode(value: unknown): value is GraphNode {
  if (!isPlainObject(value)) {
    return false;
  }
  const id = value.id;
  if (typeof id !== 'string') {
    return false;
  }
  const { label } = value as { label?: unknown };
  if (label !== undefined && typeof label !== 'string') {
    return false;
  }
  return true;
}

export function isGraphEdge(value: unknown): value is GraphEdge {
  if (!isPlainObject(value)) {
    return false;
  }
  const { from, to, label, weight } = value as {
    from?: unknown;
    to?: unknown;
    label?: unknown;
    weight?: unknown;
  };
  if (typeof from !== 'string' || typeof to !== 'string') {
    return false;
  }
  if (label !== undefined && typeof label !== 'string') {
    return false;
  }
  if (weight !== undefined && typeof weight !== 'number') {
    return false;
  }
  return true;
}

export function isGraphJSON(value: unknown): value is GraphJSON {
  if (!isPlainObject(value)) {
    return false;
  }
  const source = value as { nodes?: unknown; edges?: unknown; name?: unknown };
  if (source.name !== undefined && typeof source.name !== 'string') {
    return false;
  }
  if (!Array.isArray(source.nodes) || !source.nodes.every((node) => isGraphNode(node))) {
    return false;
  }
  if (!Array.isArray(source.edges) || !source.edges.every((edge) => isGraphEdge(edge))) {
    return false;
  }
  return true;
}

function normalizeNode(node: GraphNode): GraphNode {
  const normalizedLabel = node.label;
  return normalizedLabel === undefined ? { id: node.id } : { id: node.id, label: normalizedLabel };
}

function normalizeEdge(edge: GraphEdge): GraphEdge {
  return {
    from: edge.from,
    to: edge.to,
    ...(edge.label === undefined ? {} : { label: edge.label }),
    ...(edge.weight === undefined ? {} : { weight: edge.weight }),
  };
}

export function validateGraphJSON(value: unknown): GraphValidationResult {
  if (!isPlainObject(value)) {
    return { ok: false, errors: ['Graph JSON must be an object'] };
  }

  const source = value as { nodes?: unknown; edges?: unknown; name?: unknown };
  const errors: string[] = [];
  const normalizedNodes: GraphNode[] = [];
  const normalizedEdges: GraphEdge[] = [];
  const seenNodeIds = new Set<string>();

  if (source.name !== undefined && typeof source.name !== 'string') {
    errors.push('name: must be a string');
  }

  if (!Array.isArray(source.nodes)) {
    errors.push('nodes: missing or not an array');
  } else {
    source.nodes.forEach((node, index) => {
      if (!isGraphNode(node)) {
        errors.push(`nodes[${index}]: invalid node (id:string[,label?:string])`);
        return;
      }
      const trimmedId = node.id.trim();
      if (trimmedId === '') {
        errors.push(`nodes[${index}].id must be non-empty string`);
        return;
      }
      const nodeId = node.id;
      if (seenNodeIds.has(nodeId)) {
        errors.push(`duplicate node id "${trimmedId}"`);
        return;
      }
      seenNodeIds.add(nodeId);
      normalizedNodes.push(normalizeNode(node));
    });
  }

  if (!Array.isArray(source.edges)) {
    errors.push('edges: missing or not an array');
  } else {
    source.edges.forEach((edge, index) => {
      if (!isGraphEdge(edge)) {
        errors.push(
          `edges[${index}]: invalid edge (from:string,to:string[,label?:string,weight?:number])`,
        );
        return;
      }
      if (edge.weight !== undefined && !Number.isFinite(edge.weight)) {
        errors.push(`edges[${index}].weight must be a finite number`);
        return;
      }
      if (!seenNodeIds.has(edge.from)) {
        errors.push(`edges[${index}]: 'from' references missing node "${edge.from}"`);
      }
      if (!seenNodeIds.has(edge.to)) {
        errors.push(`edges[${index}]: 'to' references missing node "${edge.to}"`);
      }
      normalizedEdges.push(normalizeEdge(edge));
    });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const graph: GraphJSON = {
    nodes: normalizedNodes,
    edges: normalizedEdges,
    ...(typeof source.name === 'string' ? { name: source.name } : {}),
  };

  return { ok: true, errors: [], graph };
}
