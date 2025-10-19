import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { Window } from 'happy-dom';
import { readFile } from 'node:fs/promises';

declare global {
  interface Window {
    CATX?: {
      render?: (...args: unknown[]) => unknown;
      default?: { render?: (...args: unknown[]) => unknown };
    } | null;
    setTimeout(handler: (...args: unknown[]) => unknown, timeout?: number, ...args: unknown[]): number;
    clearTimeout(handle?: number): void;
  }
}

const tick = async () => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
};

describe('web demo examples', () => {
  let domWindow: Window;

  beforeEach(() => {
    domWindow = new Window();
    globalThis.window = domWindow as unknown as typeof globalThis.window;
    globalThis.document = domWindow.document as unknown as typeof globalThis.document;
    globalThis.navigator = domWindow.navigator as unknown as typeof globalThis.navigator;
    (globalThis as any).HTMLElement = domWindow.HTMLElement;
    (globalThis as any).HTMLButtonElement = domWindow.HTMLButtonElement;
    (globalThis as any).HTMLSelectElement = domWindow.HTMLSelectElement;
    (globalThis as any).HTMLTextAreaElement = domWindow.HTMLTextAreaElement;
    (globalThis as any).SVGElement = domWindow.SVGElement;
    (globalThis as any).MutationObserver = domWindow.MutationObserver;
    (globalThis as any).CustomEvent = domWindow.CustomEvent;
    (globalThis as any).PointerEvent = domWindow.PointerEvent;
    (globalThis as any).KeyboardEvent = domWindow.KeyboardEvent;
    (globalThis as any).MouseEvent = domWindow.MouseEvent;
    (globalThis as any).Event = domWindow.Event;
    let rafId = 0;
    const rafHandles = new Map<number, ReturnType<typeof domWindow.setTimeout>>();
    (globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
      rafId += 1;
      const id = rafId;
      const timeout = domWindow.setTimeout(() => {
        rafHandles.delete(id);
        cb(domWindow.performance.now());
      }, 0);
      rafHandles.set(id, timeout);
      return id;
    };
    (globalThis as any).cancelAnimationFrame = (handle: number) => {
      const timeout = rafHandles.get(handle);
      if (timeout) {
        domWindow.clearTimeout(timeout);
        rafHandles.delete(handle);
      }
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
    if ((navigator as any).clipboard) {
      delete (navigator as any).clipboard;
    }
    delete (globalThis as any).Event;
    delete (globalThis as any).MOTOR_DISABLE_WORKERS;
    delete (globalThis as any).requestAnimationFrame;
    delete (globalThis as any).cancelAnimationFrame;
    delete (globalThis as any).MouseEvent;
    delete (globalThis as any).KeyboardEvent;
    delete (globalThis as any).PointerEvent;
    delete (globalThis as any).CustomEvent;
    delete (globalThis as any).MutationObserver;
    delete (globalThis as any).SVGElement;
    delete (globalThis as any).HTMLTextAreaElement;
    delete (globalThis as any).HTMLSelectElement;
    delete (globalThis as any).HTMLButtonElement;
    delete (globalThis as any).HTMLElement;
    delete (globalThis as any).navigator;
    delete (globalThis as any).document;
    delete (globalThis as any).window;
  });

  it('loads the triangle example and updates stats/preview', async () => {
    const html = await readFile(new URL('../../web/demo/index.html', import.meta.url), 'utf8');
    document.open();
    document.write(html);
    document.close();

    document.querySelector('script[type="module"][src="./main.js"]')?.remove();

    (globalThis as any).MOTOR_DISABLE_WORKERS = true;
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    if (typeof domWindow.history.replaceState === 'function') {
      vi.spyOn(domWindow.history, 'replaceState').mockImplementation(() => {});
    } else {
      (domWindow.history as any).replaceState = () => {};
    }

    // @ts-expect-error demo bootstrap is authored in JS without type definitions
    await import('../../web/demo/main.js');

    await tick();
    await tick();

    const select = document.getElementById('graph-example') as HTMLSelectElement | null;
    const loadButton = document.getElementById('graph-apply') as HTMLButtonElement | null;
    expect(select).toBeInstanceOf(domWindow.HTMLSelectElement);
    expect(loadButton).toBeInstanceOf(domWindow.HTMLButtonElement);

    select!.value = 'diamond';
    const changeEvent = new domWindow.Event('change', { bubbles: true }) as unknown as Event;
    select!.dispatchEvent(changeEvent);
    await tick();

    select!.value = 'triangle';
    loadButton!.click();

    await tick();
    await tick();

    const nodesValue = document
      .querySelector('#graph-viewer [data-role="stats-nodes"]')
      ?.textContent?.trim();
    const edgesValue = document
      .querySelector('#graph-viewer [data-role="stats-edges"]')
      ?.textContent?.trim();
    const hasCycleValue = document
      .querySelector('#graph-viewer [data-role="analysis-has-cycle"]')
      ?.textContent?.trim();

    expect(nodesValue).toBe('3');
    expect(edgesValue).toBe('3');
    expect(hasCycleValue).toBe('Yes');

    const previewRoot = document.querySelector('#graph-viewer [data-role="svg-root"]');
    expect(previewRoot).toBeInstanceOf(domWindow.HTMLElement);
    const nodeCircles = previewRoot?.querySelectorAll('circle.motor-node-circle') ?? [];
    const edges = previewRoot?.querySelectorAll('path.motor-edge') ?? [];
    expect(nodeCircles.length).toBe(3);
    expect(edges.length).toBe(3);
  });
});
