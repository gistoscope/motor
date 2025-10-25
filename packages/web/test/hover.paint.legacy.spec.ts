import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { Window } from 'happy-dom';

import { initMathBridge } from '../src/math/bridge';
import type { MathBridgeHandle, MathEngine, MathEngineEventCallback, MathEngineEventName } from '../src/math/types';

class StubMathEngine implements MathEngine {
  #listeners: Map<MathEngineEventName, Set<MathEngineEventCallback>> = new Map([
    ['hover', new Set()],
    ['select', new Set()],
    ['state', new Set()],
  ]);

  mount(host: HTMLElement): void {
    const token = host.ownerDocument.createElement('span');
    token.dataset.tokenId = 'tok:0';
    token.textContent = '2';
    host.appendChild(token);
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

  emit(event: MathEngineEventName, payload: unknown): void {
    const bucket = this.#listeners.get(event);
    if (!bucket) {
      return;
    }
    for (const listener of bucket) {
      listener(payload);
    }
  }

  getLegalActions() {
    return [];
  }

  apply(): void {
    // no-op
  }

  export() {
    return { ast: null };
  }
}

describe('bridge hover painter', () => {
  let domWindow: Window;
  let bridge: MathBridgeHandle | null = null;
  let engine: StubMathEngine;

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

    engine = new StubMathEngine();
  });

  afterEach(() => {
    bridge?.destroy();
    bridge = null;
    document.body.innerHTML = '';
    delete (globalThis as any).MouseEvent;
    delete (globalThis as any).KeyboardEvent;
    delete (globalThis as any).PointerEvent;
    delete (globalThis as any).CustomEvent;
    delete (globalThis as any).Event;
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

  it('adds modern hover classes to data-token-id tokens', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    bridge = initMathBridge(engine, host);

    engine.emit('hover', 'tok:0');

    const token = host.querySelector('[data-token-id="tok:0"]');
    expect(token?.classList.contains('is-hovered')).toBe(true);
    expect(token?.classList.contains('math-token--hovered')).toBe(true);
  });
});
