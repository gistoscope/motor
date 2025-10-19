import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { Window } from 'happy-dom';

import { shortestPath } from '../../web/src/api';
import { createViewer } from '../../web/src/viewer';
import { getWarningMessage } from '../../web/src/errors';

describe('web analysis shortestPath', () => {
  it('computes non-negative weighted shortest path locally', () => {
    const graph = {
      nodes: [
        { id: 'A' },
        { id: 'B' },
        { id: 'C' },
      ],
      edges: [
        { from: 'A', to: 'B', weight: 2 },
        { from: 'A', to: 'C', weight: 1 },
        { from: 'C', to: 'B', weight: 1 },
      ],
    };

    const result = shortestPath(graph, 'A', 'B');

    expect(result.distance).toBe(2);
    expect(result.path).toEqual(['A', 'C', 'B']);
  });
});

describe('web viewer shortest warnings', () => {
  let domWindow: Window;

  function setup() {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const handle = createViewer(root);
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
    delete (globalThis as any).Event;
    delete (globalThis as any).CustomEvent;
    delete (globalThis as any).navigator;
    delete (globalThis as any).document;
    delete (globalThis as any).window;
  });

  it('shows warning when negative weights are present', async () => {
    const { root, handle } = setup();
    const textarea = root.querySelector<HTMLTextAreaElement>('textarea[data-role="input"]');
    const parseButton = root.querySelector<HTMLButtonElement>('button[data-action="parse"]');
    expect(textarea).toBeTruthy();
    expect(parseButton).toBeTruthy();

    const graph = {
      nodes: [
        { id: 'A', label: 'A' },
        { id: 'B', label: 'B' },
      ],
      edges: [
        { from: 'A', to: 'B', weight: -2 },
      ],
    };

    textarea!.value = JSON.stringify(graph, null, 2);
    parseButton!.click();

    const status = root.querySelector<HTMLElement>('[data-role="shortest-status"]');
    await vi.waitFor(() => {
      expect(status?.getAttribute('data-code')).toBe('WEB.E3.NEGATIVE_WEIGHT');
    });
    expect(status?.textContent?.trim()).toBe(getWarningMessage('WEB.E3.NEGATIVE_WEIGHT'));

    handle.destroy();
  });

  it('warns when no path exists between selected nodes', async () => {
    const { root, handle } = setup();
    const textarea = root.querySelector<HTMLTextAreaElement>('textarea[data-role="input"]');
    const parseButton = root.querySelector<HTMLButtonElement>('button[data-action="parse"]');
    const runButton = root.querySelector<HTMLButtonElement>('button[data-role="shortest-run"]');
    expect(textarea).toBeTruthy();
    expect(parseButton).toBeTruthy();
    expect(runButton?.disabled).toBe(true);

    const graph = {
      nodes: [
        { id: 'A', label: 'A' },
        { id: 'B', label: 'B' },
        { id: 'C', label: 'C' },
      ],
      edges: [
        { from: 'A', to: 'B', weight: 1 },
      ],
    };

    textarea!.value = JSON.stringify(graph, null, 2);
    parseButton!.click();

    const svgRoot = root.querySelector<HTMLElement>('[data-role="svg-root"]');
    svgRoot?.dispatchEvent(
      new domWindow.CustomEvent('motor:node-select', { detail: { nodeId: 'A' }, bubbles: true }) as unknown as Event,
    );
    const setSource = root.querySelector<HTMLButtonElement>('button[data-role="node-info-set-source"]');
    setSource?.click();

    svgRoot?.dispatchEvent(
      new domWindow.CustomEvent('motor:node-select', { detail: { nodeId: 'C' }, bubbles: true }) as unknown as Event,
    );
    const setTarget = root.querySelector<HTMLButtonElement>('button[data-role="node-info-set-target"]');
    setTarget?.click();

    await vi.waitFor(() => {
      const status = root.querySelector<HTMLElement>('[data-role="shortest-status"]');
      expect(status?.getAttribute('data-code')).toBe('WEB.E4.NO_PATH');
      expect(status?.textContent?.trim()).toBe(getWarningMessage('WEB.E4.NO_PATH'));
    });

    expect(runButton?.disabled).toBe(false);
    runButton?.click();

    const status = root.querySelector<HTMLElement>('[data-role="shortest-status"]');
    expect(status?.getAttribute('data-code')).toBe('WEB.E4.NO_PATH');

    handle.destroy();
  });
});
