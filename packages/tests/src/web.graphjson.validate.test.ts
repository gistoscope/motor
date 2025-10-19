import { describe, expect, it } from 'vitest';

import { validateGraphJSON } from '../../web/src/validate';

describe('validateGraphJSON', () => {
  it('accepts a valid graph', () => {
    const graph = {
      nodes: [
        { id: 'A', label: 'Start' },
        { id: 'B', label: 'Finish' },
      ],
      edges: [
        { id: 'A-B', from: 'A', to: 'B', weight: 1 },
      ],
      meta: {
        version: 1,
      },
    };

    expect(validateGraphJSON(graph)).toEqual({ ok: true });
  });

  it('reports structural issues', () => {
    const invalidGraph = {
      nodes: [
        { id: 'A' },
        { id: 'A' },
      ],
      edges: [
        { from: 'A', to: 'C' },
        { from: '', to: 'A' },
      ],
      meta: 'oops',
    };

    const result = validateGraphJSON(invalidGraph);

    expect(result.ok).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors).toContain('duplicate node id: A');
    expect(result.errors).toContain('edge references missing node C');
    expect(result.errors).toContain('edge at index 1 is invalid');
    expect(result.errors).toContain('meta must be an object when provided');
  });
});
