import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { Window } from 'happy-dom';
import { readFile } from 'node:fs/promises';

import mountPlayground from '../../web/src/ui/playground';
import type {
  MathEngine,
  MathEngineAction,
  MathEngineEventCallback,
  MathEngineEventName,
} from '../../web/src/math/types';

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

class StubMathEngine implements MathEngine {
  #listeners: Map<MathEngineEventName, Set<MathEngineEventCallback>>;
  #currentExpression = '';

  constructor() {
    this.#listeners = new Map([
      ['hover', new Set()],
      ['select', new Set()],
      ['state', new Set()],
    ]);
  }

  mount(host: HTMLElement, initial: string): void {
    const ownerDocument = host.ownerDocument ?? document;
    this.#currentExpression = initial?.trim() || 'x + y';
    host.innerHTML = '';

    const wrapper = ownerDocument.createElement('div');
    wrapper.className = 'stub-math-engine';
    wrapper.textContent = this.#currentExpression;
    wrapper.dataset.tokenId = 'stub-token';
    host.appendChild(wrapper);

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

  getLegalActions(): MathEngineAction[] {
    return [
      { id: 'undo', label: 'Undo', kind: 'builtin' },
      { id: 'redo', label: 'Redo', kind: 'builtin' },
    ];
  }

  apply(actionId: string): void {
    this.#emit('state', { ruleId: actionId });
  }

  export(): { ast: unknown; html?: string; tex?: string } {
    const expression = this.#currentExpression;
    return {
      ast: { expression },
      html: `<span data-token-id="stub-token">${expression}</span>`,
      tex: expression,
    };
  }

  #emit(event: MathEngineEventName, payload: unknown): void {
    const bucket = this.#listeners.get(event);
    if (!bucket) {
      return;
    }
    for (const listener of bucket) {
      listener(payload);
    }
  }
}

describe('web demo shell markup', () => {
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
    document.body.innerHTML = '';
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
    delete (globalThis as any).requestAnimationFrame;
    delete (globalThis as any).cancelAnimationFrame;
    delete (globalThis as any).navigator;
    delete (globalThis as any).document;
    delete (globalThis as any).window;
  });

  it('provides required playground slots and mounts without errors', async () => {
    const html = await readFile(new URL('../../web/demo/index.html', import.meta.url), 'utf8');
    document.open();
    document.write(html);
    document.close();

    const script = document.querySelector('script[type="module"][src="./main.js"]');
    script?.remove();

    const requiredRoles = [
      'math-input',
      'math-display',
      'math-actions',
      'math-history',
      'math-player',
      'math-mini-graph',
    ];

    for (const role of requiredRoles) {
      expect(document.querySelector(`[data-role="${role}"]`)).toBeTruthy();
    }

    const playgroundRoot = document.getElementById('math-playground');
    expect(playgroundRoot).toBeInstanceOf(domWindow.HTMLElement);

    const engine = new StubMathEngine();
    const handle = mountPlayground(playgroundRoot as HTMLElement, engine, {
      initialExpression: '2 + 3',
    });

    expect(handle.getExpression()).toBe('2 + 3');
    handle.destroy();
  });

  it('keeps state stable when parsing or loading repeatedly', async () => {
    const html = await readFile(new URL('../../web/demo/index.html', import.meta.url), 'utf8');
    document.open();
    document.write(html);
    document.close();

    const playgroundRoot = document.getElementById('math-playground');
    expect(playgroundRoot).toBeInstanceOf(domWindow.HTMLElement);

    const engine = new StubMathEngine();
    const handle = mountPlayground(playgroundRoot as HTMLElement, engine, {
      initialExpression: 'x + y',
    });

    const form = playgroundRoot?.querySelector('form[data-role="math-input-form"]');
    const textarea = playgroundRoot?.querySelector<HTMLTextAreaElement>('textarea[data-role="math-input"]');
    const submitButton = playgroundRoot?.querySelector<HTMLButtonElement>('button[data-role="math-input-apply"]');
    expect(form).toBeTruthy();
    expect(textarea).toBeTruthy();
    expect(submitButton).toBeTruthy();

    textarea!.value = 'a + b';
    form!.dispatchEvent(new domWindow.Event('submit', { bubbles: true, cancelable: true }) as unknown as Event);
    expect(handle.getExpression()).toBe('a + b');

    form!.dispatchEvent(new domWindow.Event('submit', { bubbles: true, cancelable: true }) as unknown as Event);
    expect(handle.getExpression()).toBe('a + b');
    expect(submitButton?.disabled).toBe(false);

    handle.loadExpression('c + d');
    expect(handle.getExpression()).toBe('c + d');
    handle.loadExpression('c + d');
    expect(handle.getExpression()).toBe('c + d');

    handle.destroy();
  });
});
