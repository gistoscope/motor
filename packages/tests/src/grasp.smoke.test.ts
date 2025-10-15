import { describe, it, expect } from 'vitest';
import { edge, makeId, node } from '@motor/grasp';

describe('grasp smoke', () => {
  it('creates nodes and edges', () => {
    const a = makeId('A'), b = makeId('B');
    const n1 = node(a, 'A'), n2 = node(b, 'B');
    const e = edge(a, b, 'A->B');
    expect(n1.id).toBe(a);
    expect(n2.label).toBe('B');
    expect(e.from).toBe(a);
    expect(e.to).toBe(b);
  });
});
