import type { GraphEdge, GraphJSON, GraphNode, GraphValidationResult } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asGraphNode(value: unknown): GraphNode | null {
  if (!isRecord(value)) {
    return null;
  }
  const { id } = value;
  if (typeof id !== 'string' || id.length === 0) {
    return null;
  }
  return value as GraphNode;
}

function asGraphEdge(value: unknown): GraphEdge | null {
  if (!isRecord(value)) {
    return null;
  }
  const { from, to } = value;
  if (typeof from !== 'string' || from.length === 0) {
    return null;
  }
  if (typeof to !== 'string' || to.length === 0) {
    return null;
  }
  return value as GraphEdge;
}

export function validateGraphJSON(value: unknown): GraphValidationResult {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return { ok: false, errors: ['graph must be an object'] };
  }

  const graph = value as GraphJSON;

  if (!('nodes' in graph)) {
    errors.push('nodes missing');
  }

  const rawNodes = graph.nodes;
  const nodeIds = new Set<string>();

  if (rawNodes === undefined) {
    // already reported as missing
  } else if (!Array.isArray(rawNodes)) {
    errors.push('nodes must be an array');
  } else if (rawNodes.length === 0) {
    errors.push('nodes must contain at least one entry');
  }

  if (Array.isArray(rawNodes)) {
    rawNodes.forEach((nodeValue, index) => {
      const node = asGraphNode(nodeValue);
      if (!node) {
        errors.push(`node at index ${index} is invalid`);
        return;
      }
      if (nodeIds.has(node.id)) {
        errors.push(`duplicate node id: ${node.id}`);
        return;
      }
      nodeIds.add(node.id);
      if ('label' in node && node.label !== undefined && typeof node.label !== 'string') {
        errors.push(`node ${node.id} has non-string label`);
      }
      if ('type' in node && node.type !== undefined && typeof node.type !== 'string') {
        errors.push(`node ${node.id} has non-string type`);
      }
      if ('data' in node && node.data !== undefined && !isRecord(node.data)) {
        errors.push(`node ${node.id} has non-object data`);
      }
    });
  }

  if (!('edges' in graph)) {
    errors.push('edges missing');
  }

  const rawEdges = graph.edges;
  const edgeIds = new Set<string>();

  if (rawEdges === undefined) {
    // already reported as missing
  } else if (!Array.isArray(rawEdges)) {
    errors.push('edges must be an array');
  }

  if (Array.isArray(rawEdges)) {
    rawEdges.forEach((edgeValue, index) => {
      const edge = asGraphEdge(edgeValue);
      if (!edge) {
        errors.push(`edge at index ${index} is invalid`);
        return;
      }
      if (edge.id !== undefined) {
        if (typeof edge.id !== 'string' || edge.id.length === 0) {
          errors.push(`edge at index ${index} has invalid id`);
        } else if (edgeIds.has(edge.id)) {
          errors.push(`duplicate edge id: ${edge.id}`);
        } else {
          edgeIds.add(edge.id);
        }
      }
      if (!nodeIds.has(edge.from)) {
        errors.push(`edge references missing node ${edge.from}`);
      }
      if (!nodeIds.has(edge.to)) {
        errors.push(`edge references missing node ${edge.to}`);
      }
      if ('label' in edge && edge.label !== undefined && typeof edge.label !== 'string') {
        errors.push(`edge ${edge.id ?? index} has non-string label`);
      }
      if ('type' in edge && edge.type !== undefined && typeof edge.type !== 'string') {
        errors.push(`edge ${edge.id ?? index} has non-string type`);
      }
      if ('data' in edge && edge.data !== undefined && !isRecord(edge.data)) {
        errors.push(`edge ${edge.id ?? index} has non-object data`);
      }
      if ('weight' in edge && edge.weight !== undefined && typeof edge.weight !== 'number') {
        errors.push(`edge ${edge.id ?? index} has non-numeric weight`);
      }
    });
  }

  if ('meta' in graph && graph.meta !== undefined && !isRecord(graph.meta)) {
    errors.push('meta must be an object when provided');
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true };
}
