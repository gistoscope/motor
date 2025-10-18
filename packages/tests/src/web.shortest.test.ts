import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { Window } from 'happy-dom';

import { createViewer } from '../../web/src/viewer';

let domWindow: Window;

type SetupOptions = { initialJSON?: string };

function setup(options: SetupOptions = {}) {
  const clipboard = {
    writeText: vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined),
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
  globalThis.CustomEvent = domWindow.CustomEvent as unknown as typeof globalThis.CustomEvent;
  globalThis.Event = domWindow.Event as unknown as typeof globalThis.Event;
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  delete (globalThis as any).window;
  delete (globalThis as any).document;
  delete (globalThis as any).navigator;
  delete (globalThis as any).CustomEvent;
  delete (globalThis as any).Event;
});

describe('web shortest path overlay', () => {
  it('highlights weighted shortest path and reports total cost', () => {
    const sample = {
      nodes: [
        { id: 'A', label: 'A' },
        { id: 'B', label: 'B' },
        { id: 'C', label: 'C' },
        { id: 'D', label: 'D' },
      ],
      edges: [
        { from: 'A', to: 'B', weight: 2 },
        { from: 'A', to: 'C', weight: 5 },
        { from: 'B', to: 'C', weight: 1 },
        { from: 'B', to: 'D', weight: 3 },
        { from: 'C', to: 'D', weight: 1 },
      ],
    };

    const { root, handle } = setup();
    const textarea = root.querySelector<HTMLTextAreaElement>('textarea[data-role="input"]');
    const parseButton = root.querySelector<HTMLButtonElement>('button[data-action="parse"]');
    expect(textarea).toBeTruthy();
    expect(parseButton).toBeTruthy();

    textarea!.value = JSON.stringify(sample, null, 2);
    parseButton!.click();

    const shortestToggle = root.querySelector<HTMLInputElement>('input[data-overlay="shortest"]');
    expect(shortestToggle?.disabled).toBe(false);

    const svgRoot = root.querySelector<HTMLElement>('[data-role="svg-root"]');
    const selectA = new domWindow.CustomEvent('motor:node-select', {
      detail: { nodeId: 'A' },
      bubbles: true,
    }) as unknown as Event;
    svgRoot?.dispatchEvent(selectA);

    const setSourceButton = root.querySelector<HTMLButtonElement>('button[data-role="node-info-set-source"]');
    expect(setSourceButton?.disabled).toBe(false);
    setSourceButton!.click();

    const selectD = new domWindow.CustomEvent('motor:node-select', {
      detail: { nodeId: 'D' },
      bubbles: true,
    }) as unknown as Event;
    svgRoot?.dispatchEvent(selectD);

    const setTargetButton = root.querySelector<HTMLButtonElement>('button[data-role="node-info-set-target"]');
    expect(setTargetButton?.disabled).toBe(false);
    setTargetButton!.click();

    const shortestPanel = root.querySelector<HTMLElement>('[data-role="shortest-panel"]');
    expect(shortestPanel?.dataset.state).toBe('path');

    const totalValue = root.querySelector<HTMLElement>('[data-role="shortest-total"]');
    expect(totalValue?.textContent?.trim()).toBe('4');

    shortestToggle!.checked = true;
    shortestToggle!.dispatchEvent(new domWindow.Event('change', { bubbles: true }) as unknown as Event);

    const pathNodes = Array.from(root.querySelectorAll<SVGGElement>('g.motor-node.motor-node--path'))
      .map((node) => node.getAttribute('data-node-id'))
      .filter((id): id is string => Boolean(id))
      .sort();
    expect(pathNodes).toEqual(['A', 'B', 'C', 'D']);

    const pathEdges = Array.from(root.querySelectorAll<SVGPathElement>('path.motor-edge.motor-edge--path'))
      .map((edge) => `${edge.getAttribute('data-from')}->${edge.getAttribute('data-to')}`)
      .sort();
    expect(pathEdges).toEqual(['A->B', 'B->C', 'C->D']);

    handle.destroy();
  });

  it('disables controls when weights are missing', () => {
    const sample = {
      nodes: [
        { id: 'A', label: 'A' },
        { id: 'B', label: 'B' },
      ],
      edges: [{ from: 'A', to: 'B' }],
    };

    const { root, handle } = setup();
    const textarea = root.querySelector<HTMLTextAreaElement>('textarea[data-role="input"]');
    const parseButton = root.querySelector<HTMLButtonElement>('button[data-action="parse"]');
    textarea!.value = JSON.stringify(sample, null, 2);
    parseButton!.click();

    const shortestToggle = root.querySelector<HTMLInputElement>('input[data-overlay="shortest"]');
    expect(shortestToggle?.disabled).toBe(true);

    const shortestPanel = root.querySelector<HTMLElement>('[data-role="shortest-panel"]');
    expect(shortestPanel?.dataset.state).toBe('disabled');

    const svgRoot = root.querySelector<HTMLElement>('[data-role="svg-root"]');
    svgRoot?.dispatchEvent(
      new domWindow.CustomEvent('motor:node-select', { detail: { nodeId: 'A' }, bubbles: true }) as unknown as Event,
    );

    const actions = root.querySelector<HTMLElement>('[data-role="node-info-actions"]');
    const setSourceButton = root.querySelector<HTMLButtonElement>('button[data-role="node-info-set-source"]');
    expect(actions?.dataset.state).toBe('disabled');
    expect(setSourceButton?.disabled).toBe(true);

    const resetButton = root.querySelector<HTMLButtonElement>('button[data-role="shortest-reset"]');
    expect(resetButton?.disabled).toBe(true);

    handle.destroy();
  });

  it('uses deterministic tie-break for equal paths', () => {
    const sample = {
      nodes: [
        { id: 'A', label: 'A' },
        { id: 'B', label: 'B' },
        { id: 'C', label: 'C' },
        { id: 'D', label: 'D' },
      ],
      edges: [
        { from: 'A', to: 'B', weight: 1 },
        { from: 'A', to: 'C', weight: 1 },
        { from: 'B', to: 'D', weight: 2 },
        { from: 'C', to: 'D', weight: 2 },
      ],
    };

    const { root, handle } = setup();
    const textarea = root.querySelector<HTMLTextAreaElement>('textarea[data-role="input"]');
    const parseButton = root.querySelector<HTMLButtonElement>('button[data-action="parse"]');
    textarea!.value = JSON.stringify(sample, null, 2);
    parseButton!.click();

    const svgRoot = root.querySelector<HTMLElement>('[data-role="svg-root"]');
    svgRoot?.dispatchEvent(
      new domWindow.CustomEvent('motor:node-select', { detail: { nodeId: 'A' }, bubbles: true }) as unknown as Event,
    );
    root.querySelector<HTMLButtonElement>('button[data-role="node-info-set-source"]')!.click();

    svgRoot?.dispatchEvent(
      new domWindow.CustomEvent('motor:node-select', { detail: { nodeId: 'D' }, bubbles: true }) as unknown as Event,
    );
    root.querySelector<HTMLButtonElement>('button[data-role="node-info-set-target"]')!.click();

    const totalValue = root.querySelector<HTMLElement>('[data-role="shortest-total"]');
    expect(totalValue?.textContent?.trim()).toBe('3');

    const shortestToggle = root.querySelector<HTMLInputElement>('input[data-overlay="shortest"]');
    shortestToggle!.checked = true;
    shortestToggle!.dispatchEvent(new domWindow.Event('change', { bubbles: true }) as unknown as Event);

    const pathNodes = Array.from(root.querySelectorAll<SVGGElement>('g.motor-node.motor-node--path'))
      .map((node) => node.getAttribute('data-node-id'))
      .filter((id): id is string => Boolean(id))
      .sort();
    expect(pathNodes).toEqual(['A', 'B', 'D']);

    const pathEdges = Array.from(root.querySelectorAll<SVGPathElement>('path.motor-edge.motor-edge--path'))
      .map((edge) => `${edge.getAttribute('data-from')}->${edge.getAttribute('data-to')}`)
      .sort();
    expect(pathEdges).toEqual(['A->B', 'B->D']);

    handle.destroy();
  });
});
