import { describe, expect, it } from 'vitest';

import {
  isGraphEdge,
  isGraphJSON,
  isGraphNode,
  validateGraphJSON,
} from '../../web/src/validate';

describe('web graph JSON validation', () => {
  it('accepts valid graphs and returns normalized data', () => {
    const input = {
      name: 'Sample',
      nodes: [
        { id: 'A', label: 'Alpha' },
        { id: 'B' },
      ],
      edges: [
        { from: 'A', to: 'B', label: 'edge', weight: 2 },
      ],
    } satisfies unknown;

    const result = validateGraphJSON(input);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('expected validation to succeed');
    }

    expect(result.errors).toEqual([]);
    expect(result.graph).toEqual({
      name: 'Sample',
      nodes: [
        { id: 'A', label: 'Alpha' },
        { id: 'B' },
      ],
      edges: [
        { from: 'A', to: 'B', label: 'edge', weight: 2 },
      ],
    });

    expect(isGraphJSON(result.graph)).toBe(true);
    expect(result.graph.nodes.every((node) => isGraphNode(node))).toBe(true);
    expect(result.graph.edges.every((edge) => isGraphEdge(edge))).toBe(true);
  });

  it('reports missing collections and type mismatches', () => {
    const result = validateGraphJSON({ nodes: 'oops', edges: null });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('expected validation to fail');
    }

    expect(result.errors).toContain('nodes: missing or not an array');
    expect(result.errors).toContain('edges: missing or not an array');
  });

  it('reports node issues, duplicates and dangling edges', () => {
    const result = validateGraphJSON({
      nodes: [
        null,
        { id: '   ' },
        { id: 'A' },
        { id: 'A' },
      ],
      edges: [
        { from: 'A', to: 'B' },
        { from: 'C', to: 'A' },
      ],
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('expected validation to fail');
    }

    expect(result.errors).toContain('nodes[0]: invalid node (id:string[,label?:string])');
    expect(result.errors).toContain('nodes[1].id must be non-empty string');
    expect(result.errors).toContain('duplicate node id "A"');
    expect(result.errors).toContain('edges[0]: \'to\' references missing node "B"');
    expect(result.errors).toContain('edges[1]: \'from\' references missing node "C"');
  });
});
