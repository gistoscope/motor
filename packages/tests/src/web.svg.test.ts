import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Window } from 'happy-dom';

import { fromJSON } from '@motor/grasp';

import { renderSVG } from '../../web/src/svg';

let domWindow: Window;

beforeEach(() => {
  domWindow = new Window();
  globalThis.window = domWindow as unknown as typeof globalThis.window;
  globalThis.document = domWindow.document as unknown as typeof globalThis.document;
});

afterEach(() => {
  document.body.innerHTML = '';
  delete (globalThis as any).window;
  delete (globalThis as any).document;
});

describe('renderSVG', () => {
  it('renders nodes and edges with data attributes', () => {
    const graph = fromJSON({
      nodes: [
        { id: 'A', label: 'Alpha' },
        { id: 'B', label: 'Beta' },
        { id: 'C', label: '' },
      ],
      edges: [
        { from: 'A', to: 'B' },
        { from: 'A', to: 'C' },
      ],
    });

    const container = document.createElement('div');
    renderSVG(container, graph);

    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();

    const circles = Array.from(container.querySelectorAll<SVGCircleElement>('circle.motor-node-circle'));
    expect(circles).toHaveLength(3);
    expect(circles.map((circle) => circle.dataset.nodeId)).toEqual(['A', 'B', 'C']);
    for (const circle of circles) {
      expect(circle.getAttribute('cx')).toBeTruthy();
      expect(circle.getAttribute('cy')).toBeTruthy();
    }

    const edges = Array.from(container.querySelectorAll<SVGPathElement>('path.motor-edge'));
    expect(edges).toHaveLength(2);
    expect(edges.map((edge) => edge.dataset.from)).toEqual(['A', 'A']);
    expect(edges.map((edge) => edge.dataset.to)).toEqual(['B', 'C']);
    edges.forEach((edge) => {
      expect(edge.getAttribute('marker-end')).toContain('motor-arrowhead');
    });

    const labels = Array.from(container.querySelectorAll('text.motor-node-label')).map((el) => el.textContent);
    expect(labels).toContain('Alpha');
    expect(labels).toContain('Beta');
    expect(labels).not.toContain('');
  });
});
