import { Window } from 'happy-dom';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';

import { createViewer } from '../../web/src/viewer';

let domWindow: Window;

function setup(options: { initialJSON?: string } = {}) {
  const clipboard = {
    writeText: async () => undefined,
  };
  const root = document.createElement('div');
  document.body.appendChild(root);
  const handle = createViewer(root, { ...options, clipboard });
  return { root, handle };
}

beforeEach(() => {
  domWindow = new Window();
  globalThis.window = domWindow as unknown as typeof globalThis.window;
  globalThis.document = domWindow.document as unknown as typeof globalThis.document;
  globalThis.navigator = domWindow.navigator as unknown as typeof globalThis.navigator;
});

afterEach(() => {
  document.body.innerHTML = '';
  delete (globalThis as any).window;
  delete (globalThis as any).document;
  delete (globalThis as any).navigator;
});

describe('web overlays', () => {
  it('applies SCC classes consistently across components', () => {
    const sample = {
      nodes: [
        { id: 'A', label: 'A' },
        { id: 'B', label: 'B' },
        { id: 'C', label: 'C' },
        { id: 'D', label: 'D' },
        { id: 'E', label: 'E' },
      ],
      edges: [
        { from: 'A', to: 'B' },
        { from: 'B', to: 'C' },
        { from: 'C', to: 'A' },
        { from: 'D', to: 'E' },
        { from: 'E', to: 'D' },
      ],
    };

    const { root } = setup();
    const textarea = root.querySelector<HTMLTextAreaElement>('textarea[data-role="input"]');
    const parseButton = root.querySelector<HTMLButtonElement>('button[data-action="parse"]');
    expect(textarea).toBeTruthy();
    expect(parseButton).toBeTruthy();

    textarea!.value = JSON.stringify(sample, null, 2);
    parseButton!.click();

    const toggleScc = root.querySelector<HTMLButtonElement>('button[data-role="toggle-scc"]');
    expect(toggleScc).toBeTruthy();
    expect(toggleScc!.disabled).toBe(false);

    toggleScc!.click();

    const svgRoot = root.querySelector('[data-role="svg-root"]');
    expect(svgRoot).toBeTruthy();
    const nodeGroups = Array.from(svgRoot!.querySelectorAll<SVGGElement>('.motor-node'));

    const classByNode = new Map<string, string | null>();
    for (const group of nodeGroups) {
      const nodeId = group.getAttribute('data-node-id');
      if (!nodeId) continue;
      const sccClass = Array.from(group.classList).find((cls) => cls.startsWith('motor-scc-')) ?? null;
      classByNode.set(nodeId, sccClass);
    }

    expect(classByNode.get('A')).toBe(classByNode.get('B'));
    expect(classByNode.get('B')).toBe(classByNode.get('C'));
    expect(classByNode.get('D')).toBe(classByNode.get('E'));
    expect(classByNode.get('A')).not.toBe(classByNode.get('D'));

    const uniqueClasses = new Set(Array.from(classByNode.values()).filter((cls): cls is string => Boolean(cls)));
    expect(uniqueClasses.size).toBeGreaterThanOrEqual(2);
  });

  it('highlights cycle edges and updates stats', () => {
    const sample = {
      nodes: [
        { id: 'A', label: 'A' },
        { id: 'B', label: 'B' },
        { id: 'C', label: 'C' },
        { id: 'D', label: 'D' },
      ],
      edges: [
        { from: 'A', to: 'B' },
        { from: 'B', to: 'C' },
        { from: 'C', to: 'A' },
        { from: 'C', to: 'D' },
      ],
    };

    const { root } = setup();
    const textarea = root.querySelector<HTMLTextAreaElement>('textarea[data-role="input"]');
    const parseButton = root.querySelector<HTMLButtonElement>('button[data-action="parse"]');
    textarea!.value = JSON.stringify(sample, null, 2);
    parseButton!.click();

    const hasCycle = root.querySelector('[data-role="stats-has-cycle"]')?.textContent?.trim();
    const sccCount = root.querySelector('[data-role="stats-scc-count"]')?.textContent?.trim();
    const warning = root.querySelector('[data-role="analysis-warning"]')?.textContent?.trim();
    expect(hasCycle).toBe('Yes');
    expect(sccCount).toBe('2');
    expect(warning).toContain('Cycles detected');

    const toggleCycles = root.querySelector<HTMLButtonElement>('button[data-role="toggle-cycles"]');
    expect(toggleCycles).toBeTruthy();
    expect(toggleCycles!.disabled).toBe(false);

    toggleCycles!.click();

    const svgRoot = root.querySelector('[data-role="svg-root"]');
    expect(svgRoot).toBeTruthy();
    const edges = Array.from(svgRoot!.querySelectorAll<SVGPathElement>('path.motor-edge'));
    const cycleEdges = edges.filter((edge) => edge.classList.contains('motor-edge--cycle'));
    const nonCycleEdges = edges.filter((edge) => !edge.classList.contains('motor-edge--cycle'));

    const cycleEdgeEndpoints = cycleEdges.map((edge) => `${edge.getAttribute('data-from')}->${edge.getAttribute('data-to')}`);
    expect(new Set(cycleEdgeEndpoints)).toEqual(new Set(['A->B', 'B->C', 'C->A']));
    expect(nonCycleEdges).toHaveLength(1);
    expect(nonCycleEdges[0]?.getAttribute('data-from')).toBe('C');
    expect(nonCycleEdges[0]?.getAttribute('data-to')).toBe('D');

    const cycleContainer = root.querySelector('[data-role="stats-cycle-container"]');
    const cycleEdgesValue = root.querySelector('[data-role="stats-cycle-edges"]')?.textContent?.trim();
    expect(cycleContainer?.getAttribute('data-state')).toBe('visible');
    expect(cycleEdgesValue).toBe('3');

    const updatedWarning = root.querySelector('[data-role="analysis-warning"]')?.textContent?.trim();
    expect(updatedWarning).toContain('highlighted');
  });
});
