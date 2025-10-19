import { describe, expect, it } from 'vitest';

import { shortestPath } from '../../web/src/analysis-core';

describe('web analysis shortestPath', () => {
  it('computes non-negative weighted shortest path locally', () => {
    const graph = {
      nodes: [
        { id: 'A' },
        { id: 'B' },
        { id: 'C' },
      ],
      edges: [
        { from: 'A', to: 'B', weight: 2 },
        { from: 'A', to: 'C', weight: 1 },
        { from: 'C', to: 'B', weight: 1 },
      ],
    };

    const result = shortestPath(graph, 'A', 'B');

    expect(result.distance).toBe(2);
    expect(result.path).toEqual(['A', 'C', 'B']);
  });
});
