import { describe, expect, it } from 'vitest';

import { hasCycleDirected } from '../../web/src/api';

describe('web analysis hasCycleDirected', () => {
  it('detects a directed cycle', () => {
    const graph = {
      nodes: [
        { id: 'A' },
        { id: 'B' },
        { id: 'C' },
      ],
      edges: [
        { from: 'A', to: 'B' },
        { from: 'B', to: 'C' },
        { from: 'C', to: 'A' },
      ],
    };

    expect(hasCycleDirected(graph)).toBe(true);
  });

  it('returns false for an acyclic graph', () => {
    const graph = {
      nodes: [
        { id: 'A' },
        { id: 'B' },
        { id: 'C' },
      ],
      edges: [
        { from: 'A', to: 'B' },
        { from: 'B', to: 'C' },
      ],
    };

    expect(hasCycleDirected(graph)).toBe(false);
  });
});
