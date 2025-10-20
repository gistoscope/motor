import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Window } from 'happy-dom';

import { createViewer } from '../../web/src/viewer';

let domWindow: Window;

function setup() {
  const clipboard = {
    writeText: vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined),
  };
  const root = document.createElement('div');
  document.body.appendChild(root);
  const handle = createViewer(root, { clipboard });
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

describe('viewer sizing tokens', () => {
  it('applies radius and stroke width from CSS variables', () => {
    const sample = {
      nodes: [
        { id: 'A', label: 'Alpha' },
        { id: 'B', label: 'Beta' },
      ],
      edges: [
        { from: 'A', to: 'B' },
      ],
    };

    const { root, handle } = setup();

    const textarea = root.querySelector<HTMLTextAreaElement>('textarea[data-role="input"]');
    const parseButton = root.querySelector<HTMLButtonElement>('button[data-action="parse"]');
    expect(textarea).toBeTruthy();
    expect(parseButton).toBeTruthy();
    textarea!.value = JSON.stringify(sample, null, 2);
    parseButton!.click();

    const circle = root.querySelector<SVGCircleElement>('circle.motor-node-circle');
    expect(circle).toBeTruthy();
    const radius = Number.parseFloat(circle!.getAttribute('r') ?? '0');
    expect(radius).toBeGreaterThanOrEqual(8);
    expect(radius).toBeLessThanOrEqual(20);

    const edge = root.querySelector<SVGPathElement>('path.motor-edge');
    expect(edge).toBeTruthy();
    const computed = window.getComputedStyle(edge!);
    const strokeWidthValue = Number.parseFloat(computed.strokeWidth);
    const strokeWidth = Number.isFinite(strokeWidthValue)
      ? strokeWidthValue
      : Number.parseFloat(edge!.getAttribute('stroke-width') ?? '0');
    expect(strokeWidth).toBeGreaterThan(0);

    handle.destroy();
  });
});
