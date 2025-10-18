import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { Window } from 'happy-dom';

import { createViewer } from '../../web/src/viewer';

let domWindow: Window;

type SetupOptions = { initialJSON?: string };

function setup(options: SetupOptions = {}) {
  const root = document.createElement('div');
  document.body.appendChild(root);
  const handle = createViewer(root, options);
  return { root, handle };
}

beforeEach(() => {
  domWindow = new Window();
  globalThis.window = domWindow as unknown as typeof globalThis.window;
  globalThis.document = domWindow.document as unknown as typeof globalThis.document;
  globalThis.navigator = domWindow.navigator as unknown as typeof globalThis.navigator;
  globalThis.CustomEvent = domWindow.CustomEvent as unknown as typeof globalThis.CustomEvent;
  globalThis.PointerEvent = domWindow.PointerEvent as unknown as typeof globalThis.PointerEvent;
});

afterEach(() => {
  document.body.innerHTML = '';
  delete (globalThis as any).window;
  delete (globalThis as any).document;
  delete (globalThis as any).navigator;
  delete (globalThis as any).CustomEvent;
  delete (globalThis as any).PointerEvent;
});

describe('svg interactions', () => {
  it('highlights nodes and edges on hover and selection and updates node info panel', () => {
    const graph = {
      nodes: [
        { id: 'A', label: 'Alpha' },
        { id: 'B', label: 'Beta' },
        { id: 'C', label: '' },
      ],
      edges: [
        { from: 'A', to: 'B' },
        { from: 'A', to: 'C' },
        { from: 'C', to: 'A' },
      ],
    };

    const { root, handle } = setup({ initialJSON: JSON.stringify(graph) });

    const svgRoot = root.querySelector('[data-role="svg-root"]');
    const svg = svgRoot?.querySelector('svg');
    expect(svgRoot).toBeTruthy();
    expect(svg).toBeTruthy();

    const nodeInfoId = root.querySelector('[data-role="node-info-id"]');
    const nodeInfoLabel = root.querySelector('[data-role="node-info-label"]');
    const nodeInfoIn = root.querySelector('[data-role="node-info-in"]');
    const nodeInfoOut = root.querySelector('[data-role="node-info-out"]');
    expect(nodeInfoId?.textContent?.trim()).toBe('—');
    expect(nodeInfoLabel?.textContent?.trim()).toBe('—');
    expect(nodeInfoIn?.textContent?.trim()).toBe('—');
    expect(nodeInfoOut?.textContent?.trim()).toBe('—');

    let hoverDetail: string | null = null;
    let selectDetail: string | null = null;
    svgRoot?.addEventListener('motor:node-hover', (event) => {
      const detail = (event as CustomEvent<{ nodeId: string | null }>).detail;
      hoverDetail = detail?.nodeId ?? null;
    });
    svgRoot?.addEventListener('motor:node-select', (event) => {
      const detail = (event as CustomEvent<{ nodeId: string | null }>).detail;
      selectDetail = detail?.nodeId ?? null;
    });

    const circleA = svgRoot?.querySelector('circle[data-node-id="A"]');
    const groupA = svgRoot?.querySelector('g[data-node-id="A"]');
    const hoverEvent = new domWindow.PointerEvent('pointerover', { bubbles: true }) as unknown as Event;
    circleA?.dispatchEvent(hoverEvent);
    expect(hoverDetail).toBe('A');
    expect(groupA?.classList.contains('motor-node--hover')).toBe(true);

    const edges = Array.from(svgRoot?.querySelectorAll('path.motor-edge') ?? []);
    const hoveredEdges = edges
      .filter((edge) => edge.classList.contains('motor-edge--hover'))
      .map((edge) => `${edge.getAttribute('data-from')}->${edge.getAttribute('data-to')}`)
      .sort();
    expect(hoveredEdges).toEqual(['A->B', 'A->C', 'C->A']);

    const leaveEvent = new domWindow.PointerEvent('pointerout', { bubbles: true }) as unknown as Event;
    circleA?.dispatchEvent(leaveEvent);
    expect(groupA?.classList.contains('motor-node--hover')).toBe(false);
    expect(edges.some((edge) => edge.classList.contains('motor-edge--hover'))).toBe(false);

    const circleC = svgRoot?.querySelector('circle[data-node-id="C"]');
    const groupC = svgRoot?.querySelector('g[data-node-id="C"]');
    const clickC = new domWindow.MouseEvent('click', { bubbles: true }) as unknown as Event;
    circleC?.dispatchEvent(clickC);
    expect(selectDetail).toBe('C');
    expect(groupC?.classList.contains('motor-node--selected')).toBe(true);

    const selectedEdges = edges
      .filter((edge) => edge.classList.contains('motor-edge--selected'))
      .map((edge) => `${edge.getAttribute('data-from')}->${edge.getAttribute('data-to')}`)
      .sort();
    expect(selectedEdges).toEqual(['A->C', 'C->A']);

    expect(nodeInfoId?.textContent?.trim()).toBe('C');
    expect(nodeInfoLabel?.textContent?.trim()).toBe('—');
    expect(nodeInfoIn?.textContent?.trim()).toBe('1');
    expect(nodeInfoOut?.textContent?.trim()).toBe('1');
    const nodeInfo = root.querySelector('[data-role="node-info"]');
    expect(nodeInfo?.getAttribute('data-state')).toBe('active');

    const clearEvent = new domWindow.CustomEvent('motor:node-select', {
      detail: { nodeId: null },
      bubbles: true,
    }) as unknown as Event;
    svgRoot?.dispatchEvent(clearEvent);
    expect(selectDetail).toBe(null);
    expect(groupC?.classList.contains('motor-node--selected')).toBe(false);
    expect(edges.some((edge) => edge.classList.contains('motor-edge--selected'))).toBe(false);
    expect(nodeInfoId?.textContent?.trim()).toBe('—');
    expect(nodeInfo?.getAttribute('data-state')).toBe('empty');

    handle.destroy();
  });
});
