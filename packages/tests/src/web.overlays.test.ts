import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { Window } from 'happy-dom';

import { createViewer } from '../../web/src/viewer';

let domWindow: Window;

function setup(options: { initialJSON?: string } = {}) {
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
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  delete (globalThis as any).window;
  delete (globalThis as any).document;
  delete (globalThis as any).navigator;
});

describe('web overlays', () => {
  it('assigns consistent SCC classes per component', async () => {
    const sample = {
      nodes: [
        { id: 'A', label: 'Alpha' },
        { id: 'B', label: 'Beta' },
        { id: 'C', label: 'Gamma' },
        { id: 'D', label: 'Delta' },
      ],
      edges: [
        { from: 'A', to: 'B' },
        { from: 'B', to: 'A' },
        { from: 'C', to: 'C' },
      ],
    };

    const { root } = setup();
    const textarea = root.querySelector<HTMLTextAreaElement>('textarea[data-role="input"]');
    const parseButton = root.querySelector<HTMLButtonElement>('button[data-action="parse"]');
    expect(textarea).toBeTruthy();
    expect(parseButton).toBeTruthy();

    textarea!.value = JSON.stringify(sample, null, 2);
    parseButton!.click();

    await vi.waitFor(() => {
      const toggle = root.querySelector<HTMLInputElement>(
        'input[data-role="overlay-toggle"][data-overlay="scc"]',
      );
      expect(toggle?.disabled).toBe(false);
    });
    const sccToggle = root.querySelector<HTMLInputElement>(
      'input[data-role="overlay-toggle"][data-overlay="scc"]',
    );
    sccToggle!.checked = true;
    sccToggle!.dispatchEvent(new Event('change', { bubbles: true }));

    await vi.waitFor(() => {
      const nodes = Array.from(root.querySelectorAll<SVGGElement>('g.motor-node'));
      const hasOverlay = nodes.some((node) => Array.from(node.classList).some((cls) => cls.startsWith('motor-scc-')));
      expect(hasOverlay).toBe(true);
    });

    const nodes = Array.from(root.querySelectorAll<SVGGElement>('g.motor-node'));
    const classByNode = new Map<string, string | undefined>();
    nodes.forEach((node) => {
      const id = node.getAttribute('data-node-id');
      if (!id) return;
      const sccClass = Array.from(node.classList).find((cls) => cls.startsWith('motor-scc-'));
      classByNode.set(id, sccClass);
    });

    const classA = classByNode.get('A');
    const classB = classByNode.get('B');
    const classC = classByNode.get('C');
    const classD = classByNode.get('D');

    expect(classA).toBeDefined();
    expect(classB).toBeDefined();
    expect(classC).toBeDefined();
    expect(classD).toBeDefined();

    expect(classA).toBe(classB);
    expect(classA).not.toBe(classC);
    expect(classA).not.toBe(classD);
    expect(classC).not.toBe(classD);
  });

  it('marks only cycle edges when enabled', async () => {
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
        { from: 'A', to: 'D' },
      ],
    };

    const { root } = setup();
    const textarea = root.querySelector<HTMLTextAreaElement>('textarea[data-role="input"]');
    const parseButton = root.querySelector<HTMLButtonElement>('button[data-action="parse"]');
    textarea!.value = JSON.stringify(sample, null, 2);
    parseButton!.click();

    await vi.waitFor(() => {
      const toggle = root.querySelector<HTMLInputElement>(
        'input[data-role="overlay-toggle"][data-overlay="cycles"]',
      );
      expect(toggle?.disabled).toBe(false);
    });
    const cycleToggle = root.querySelector<HTMLInputElement>(
      'input[data-role="overlay-toggle"][data-overlay="cycles"]',
    );
    cycleToggle!.checked = true;
    cycleToggle!.dispatchEvent(new Event('change', { bubbles: true }));

    await vi.waitFor(() => {
      const edges = Array.from(root.querySelectorAll<SVGPathElement>('path.motor-edge'));
      const anyHighlighted = edges.some((edge) => edge.classList.contains('motor-edge--cycle'));
      expect(anyHighlighted).toBe(true);
    });

    const edges = Array.from(root.querySelectorAll<SVGPathElement>('path.motor-edge'));
    const highlighted = edges
      .filter((edge) => edge.classList.contains('motor-edge--cycle'))
      .map((edge) => ({
        from: edge.getAttribute('data-from'),
        to: edge.getAttribute('data-to'),
      }));

    expect(highlighted).toEqual([
      { from: 'A', to: 'B' },
      { from: 'B', to: 'C' },
      { from: 'C', to: 'A' },
    ]);
  });

  it('updates analysis panel metrics', async () => {
    const sample = {
      nodes: [
        { id: 'X', label: 'X' },
        { id: 'Y', label: 'Y' },
        { id: 'Z', label: 'Z' },
      ],
      edges: [
        { from: 'X', to: 'Y' },
        { from: 'Y', to: 'Z' },
        { from: 'Z', to: 'X' },
      ],
    };

    const { root } = setup();
    const textarea = root.querySelector<HTMLTextAreaElement>('textarea[data-role="input"]');
    const parseButton = root.querySelector<HTMLButtonElement>('button[data-action="parse"]');
    textarea!.value = JSON.stringify(sample, null, 2);
    parseButton!.click();

    await vi.waitFor(() => {
      const hasCycle = root.querySelector('[data-role="analysis-has-cycle"]')?.textContent?.trim();
      const sccCount = root.querySelector('[data-role="analysis-scc-count"]')?.textContent?.trim();
      const cycleEdges = root.querySelector('[data-role="analysis-cycle-edges"]')?.textContent?.trim();
      const warningText = root.querySelector('[data-role="analysis-warnings"] li')?.textContent?.trim();

      expect(hasCycle).toBe('Yes');
      expect(sccCount).toBe('1');
      expect(cycleEdges).toBe('3');
      expect(warningText).toBe('Cycles detected in the graph.');
    });
  });
});
