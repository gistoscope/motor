import { describe, it, expect } from 'vitest';
import { createGraph, addNode, addEdge, makeId, node, edge, toJSON } from '@motor/grasp';

const A = makeId('A'), B = makeId('B'), C = makeId('C');

function small() {
  const g = createGraph();
  [A, B, C].forEach(id => addNode(g, node(id, String(id))));
  addEdge(g, edge(A, B));
  addEdge(g, edge(B, C));
  return g;
}

describe('snapshot: toJSON', () => {
  it('emits stable, sorted JSON', () => {
    const g = small();
    expect(toJSON(g)).toMatchInlineSnapshot(`
      {
        "edges": [
          {
            "from": "A",
            "to": "B",
          },
          {
            "from": "B",
            "to": "C",
          },
        ],
        "nodes": [
          {
            "id": "A",
            "label": "A",
          },
          {
            "id": "B",
            "label": "B",
          },
          {
            "id": "C",
            "label": "C",
          },
        ],
      }
    `);
  });
});
