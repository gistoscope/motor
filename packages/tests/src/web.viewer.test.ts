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
  return { root, clipboard, handle };
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

describe('web viewer', () => {
  it('renders stats, edges, DOT and Inspect after parsing', () => {
    const sample = {
      nodes: [
        { id: 'A', label: 'Alpha' },
        { id: 'B', label: 'Beta' },
        { id: 'C', label: 'Gamma' },
      ],
      edges: [
        { from: 'A', to: 'B' },
        { from: 'B', to: 'C' },
      ],
    };

    const { root } = setup();

    const textarea = root.querySelector<HTMLTextAreaElement>('textarea[data-role="input"]');
    const parseButton = root.querySelector<HTMLButtonElement>('button[data-action="parse"]');
    expect(textarea).toBeTruthy();
    expect(parseButton).toBeTruthy();
    textarea!.value = JSON.stringify(sample, null, 2);
    parseButton!.click();

    const nodesValue = root.querySelector('[data-role="stats-nodes"]')?.textContent?.trim();
    const edgesValue = root.querySelector('[data-role="stats-edges"]')?.textContent?.trim();
    expect(nodesValue).toBe('3');
    expect(edgesValue).toBe('2');

    const edgeItems = Array.from(root.querySelectorAll('[data-role="edge-item"]')).map((el) => el.textContent?.trim());
    expect(edgeItems).toEqual(['"A" -> "B"', '"B" -> "C"']);

    const dotOutput = root.querySelector('[data-role="dot-output"]')?.textContent?.trim();
    const inspectOutput = root.querySelector('[data-role="inspect-output"]')?.textContent?.trim();
    expect(dotOutput).toContain('digraph');
    expect(dotOutput).not.toBe('');
    expect(inspectOutput).toContain('nodes:');
    expect(inspectOutput).toContain('edges:');

    const svgRoot = root.querySelector('[data-role="svg-root"]');
    expect(svgRoot).toBeTruthy();
    const circles = svgRoot ? svgRoot.querySelectorAll('circle.motor-node-circle') : null;
    const edgesSvg = svgRoot ? svgRoot.querySelectorAll('path.motor-edge') : null;
    expect(circles?.length).toBe(3);
    expect(edgesSvg?.length).toBe(2);
  });

  it('reports validation issues and clears previous output', () => {
    const { root } = setup();

    const textarea = root.querySelector<HTMLTextAreaElement>('textarea[data-role="input"]');
    const parseButton = root.querySelector<HTMLButtonElement>('button[data-action="parse"]');
    textarea!.value = JSON.stringify({ nodes: [{ id: '', label: 'bad' }], edges: [] });
    parseButton!.click();

    const errors = root.querySelector('[data-role="errors"]')?.textContent ?? '';
    expect(errors).toContain('nodes[0].id must be non-empty string');

    const nodesValue = root.querySelector('[data-role="stats-nodes"]')?.textContent?.trim();
    const edgesValue = root.querySelector('[data-role="stats-edges"]')?.textContent?.trim();
    expect(nodesValue).toBe('—');
    expect(edgesValue).toBe('—');

    const dotOutput = root.querySelector('[data-role="dot-output"]')?.textContent;
    const inspectOutput = root.querySelector('[data-role="inspect-output"]')?.textContent;
    expect(dotOutput).toBe('');
    expect(inspectOutput).toBe('');

    const svgRoot = root.querySelector('[data-role="svg-root"]');
    expect(svgRoot?.children.length).toBe(0);
  });

  it('copies DOT and Inspect outputs via clipboard', async () => {
    const sample = {
      nodes: [
        { id: 'A', label: 'Alpha' },
        { id: 'B', label: 'Beta' },
      ],
      edges: [
        { from: 'A', to: 'B' },
      ],
    };

    const { root, clipboard } = setup();

    const textarea = root.querySelector<HTMLTextAreaElement>('textarea[data-role="input"]');
    const parseButton = root.querySelector<HTMLButtonElement>('button[data-action="parse"]');
    textarea!.value = JSON.stringify(sample, null, 2);
    parseButton!.click();

    const copyDot = root.querySelector<HTMLButtonElement>('button[data-target="dot"]');
    copyDot!.click();
    await Promise.resolve();
    expect(clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('digraph'));

    const copyInspect = root.querySelector<HTMLButtonElement>('button[data-target="inspect"]');
    copyInspect!.click();
    await Promise.resolve();
    expect(clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('nodes:'));

    await vi.waitFor(() => {
      const status = root.querySelector('[data-role="copy-status"]')?.textContent?.trim();
      expect(status).toContain('copied');
    });
  });
});
