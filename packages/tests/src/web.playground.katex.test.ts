import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { Window } from 'happy-dom';
import { readFile } from 'node:fs/promises';

import mountPlayground from '../../web/src/ui/playground';
import type { MathEngine, MathEngineEventCallback, MathEngineEventName } from '../../web/src/math/types';

class StubMathEngine implements MathEngine {
  #listeners: Map<MathEngineEventName, Set<MathEngineEventCallback>> = new Map([
    ['hover', new Set()],
    ['select', new Set()],
    ['state', new Set()],
  ]);

  #expression = '';

  mount(host: HTMLElement, initial: string): void {
    const ownerDocument = host.ownerDocument ?? document;
    this.#expression = initial?.trim() || '\\frac{a+b}{c}';
    host.innerHTML = '';
    const span = ownerDocument.createElement('span');
    span.textContent = this.#expression;
    host.appendChild(span);
    this.#emit('state', { ruleId: null });
  }

  on(event: MathEngineEventName, cb: MathEngineEventCallback): () => void {
    const bucket = this.#listeners.get(event);
    if (!bucket) {
      throw new Error(`Unsupported event: ${event}`);
    }
    bucket.add(cb);
    return () => {
      bucket.delete(cb);
    };
  }

  getLegalActions() {
    return [];
  }

  apply(_actionId: string): void {
    // no-op for stub
  }

  export(): { ast: unknown; html?: string; tex?: string } {
    return {
      ast: { expression: this.#expression },
      tex: this.#expression,
    };
  }

  #emit(event: MathEngineEventName, payload: unknown) {
    const bucket = this.#listeners.get(event);
    if (!bucket) {
      return;
    }
    for (const listener of bucket) {
      listener(payload);
    }
  }
}

describe('math playground KaTeX display', () => {
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
    (globalThis as any).Event = domWindow.Event;
    (globalThis as any).CustomEvent = domWindow.CustomEvent;
    (globalThis as any).PointerEvent = domWindow.PointerEvent;
    (globalThis as any).KeyboardEvent = domWindow.KeyboardEvent;
    (globalThis as any).MouseEvent = domWindow.MouseEvent;
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
    document.body.innerHTML = '';
    delete (globalThis as any).cancelAnimationFrame;
    delete (globalThis as any).requestAnimationFrame;
    delete (globalThis as any).Event;
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

  it('renders KaTeX output after katex:ready event', async () => {
    const html = await readFile(new URL('../../web/demo/index.html', import.meta.url), 'utf8');
    document.open();
    document.write(html);
    document.close();

    const script = document.querySelector('script[type="module"][src="./main.js"]');
    script?.remove();

    const playgroundRoot = document.getElementById('math-playground');
    expect(playgroundRoot).toBeInstanceOf(domWindow.HTMLElement);

    const engine = new StubMathEngine();
    const handle = mountPlayground(playgroundRoot as HTMLElement, engine, {
      initialExpression: '\\frac{a+b}{c}',
    });

    (domWindow as unknown as { katex?: unknown }).katex = {
      render(tex: string, element: HTMLElement) {
        const ownerDocument = element.ownerDocument ?? document;
        element.innerHTML = '';
        const span = ownerDocument.createElement('span');
        span.className = 'katex';
        span.textContent = tex;
        element.appendChild(span);
      },
    };

    domWindow.document.dispatchEvent(new domWindow.Event('katex:ready'));
    await Promise.resolve();
    await Promise.resolve();

    const display = playgroundRoot?.querySelector('[data-role="math-display-catx"]');
    expect(display?.querySelector('.katex')).toBeTruthy();

    const badge = playgroundRoot?.querySelector('[data-role="math-display-katex-badge"]');
    expect(badge?.textContent).toContain('KaTeX: loaded');

    handle.destroy();
  });
});
