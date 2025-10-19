import { describe, expect, it } from 'vitest';

import { hasCycleDirected } from '../../web/src/api';

describe('web analysis hasCycleDirected', () => {
  it('detects cycles in directed graphs', () => {
    const cyclic = {
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

    expect(hasCycleDirected(cyclic)).toBe(true);
  });

  it('returns false for acyclic graphs', () => {
    const acyclic = {
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

    expect(hasCycleDirected(acyclic)).toBe(false);
  });
});
