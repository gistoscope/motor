import { describe, it, expect } from 'vitest';
import { makeId, node, edge, createGraph, addNode, addEdge } from '@motor/grasp';
import { toJSON, fromJSON, validateDTO, type GraspDTO } from '@motor/grasp';

const A = makeId('A'), B = makeId('B'), C = makeId('C');

function small() {
  const g = createGraph();
  [A, B, C].forEach(id => addNode(g, node(id, String(id))));
  addEdge(g, edge(A, B));
  addEdge(g, edge(B, C));
  return g;
}

describe('grasp JSON I/O', () => {
  it('round-trips graph via JSON', () => {
    const g1 = small();
    const dto = toJSON(g1);
    const text = JSON.stringify(dto);
    const dto2 = JSON.parse(text) as GraspDTO;
    const g2 = fromJSON(dto2);

    // compare simple invariants
    const normalize = (g: ReturnType<typeof createGraph>) =>
      Array.from(g.adj.entries())
        .map(([k, v]) => [String(k), Array.from(v).map(String).sort()] as [string, string[]])
        .sort((a, b) => a[0].localeCompare(b[0]));

    expect(normalize(g2)).toEqual(normalize(g1));
  });

  it('validateDTO catches duplicates and missing endpoints', () => {
    const bad: any = {
      nodes: [{ id: 'X', label: 'X' }, { id: 'X', label: 'dup' }],
      edges: [{ from: 'X', to: 'Y' }]
    };
    const errs = validateDTO(bad);
    expect(errs.some(e => e.includes('duplicate node id'))).toBe(true);
    expect(errs.some(e => e.includes('edge.to not found'))).toBe(true);
  });

  it('fromJSON throws on invalid DTO', () => {
    const bad: any = { nodes: [{ id: 'P', label: 'P' }], edges: [{ from: 'P', to: 'Q' }] };
    expect(() => fromJSON(bad as GraspDTO)).toThrowError(/Invalid GraspDTO/);
  });
});
