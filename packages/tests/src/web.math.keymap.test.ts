import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { Window } from 'happy-dom';

import { attachMathEngine } from '../../web/src/math/bridge';
import type {
  MathBridgeHandle,
  MathEngine,
  MathEngineAction,
  MathEngineEventCallback,
} from '../../web/src/math/types';

interface KeymapConfig {
  initial: string;
  actions: MathEngineAction[];
  transitions?: Record<string, string>;
}

class MockKeymapEngine implements MathEngine {
  #host: HTMLElement | null = null;
  #listeners: Record<'hover' | 'select' | 'state', Set<MathEngineEventCallback>> = {
    hover: new Set(),
    select: new Set(),
    state: new Set(),
  };
  #expression: string;
  #actions: MathEngineAction[];
  #transitions: Record<string, string>;

  applied: string[] = [];
  selectHistory: string[] = [];

  constructor(config: KeymapConfig) {
    this.#expression = config.initial;
    this.#actions = config.actions;
    this.#transitions = config.transitions ?? {};
  }

  mount(host: HTMLElement, initial: string): void {
    this.#host = host;
    this.#expression = initial;
    this.#render();
    this.#emit('state', { legalActions: this.#actions });
  }

  on(event: string, cb: MathEngineEventCallback): () => void {
    if (event !== 'hover' && event !== 'select' && event !== 'state') {
      return () => {};
    }
    this.#listeners[event].add(cb);
    return () => {
      this.#listeners[event].delete(cb);
    };
  }

  getLegalActions(): MathEngineAction[] {
    return [...this.#actions];
  }

  apply(actionId: string): void {
    this.applied.push(actionId);
    const next = this.#transitions[actionId];
    if (typeof next === 'string') {
      this.#expression = next;
      this.#render();
    }
    this.#emit('state', { ruleId: actionId, legalActions: this.#actions });
  }

  select(mode: string): void {
    this.selectHistory.push(mode);
  }

  export(): { ast: unknown; html?: string | undefined; tex?: string | undefined } {
    return {
      ast: { expression: this.#expression },
      html: this.#host?.innerHTML,
    };
  }

  emitSelect(ids: unknown): void {
    this.#emit('select', ids);
  }

  emitHover(ids: unknown): void {
    this.#emit('hover', ids);
  }

  #render(): void {
    if (!this.#host) {
      return;
    }
    if (this.#expression === '2+3') {
      this.#host.innerHTML = [
        '<span data-token-id="left">2</span>',
        '<span data-token-id="op">+</span>',
        '<span data-token-id="right">3</span>',
      ].join(' ');
      return;
    }
    if (this.#expression === '3x+2x') {
      this.#host.innerHTML = [
        '<span data-token-id="l-term">3x</span>',
        '<span data-token-id="op">+</span>',
        '<span data-token-id="r-term">2x</span>',
      ].join(' ');
      return;
    }
    if (this.#expression === 'a(b+c)') {
      this.#host.innerHTML = [
        '<span data-token-id="factor">a</span>',
        '<span data-token-id="open">(</span>',
        '<span data-token-id="b">b</span>',
        '<span data-token-id="plus">+</span>',
        '<span data-token-id="c">c</span>',
        '<span data-token-id="close">)</span>',
      ].join(' ');
      return;
    }
    if (this.#expression === 'ab+ac') {
      this.#host.innerHTML = [
        '<span data-token-id="ab">ab</span>',
        '<span data-token-id="plus">+</span>',
        '<span data-token-id="ac">ac</span>',
      ].join(' ');
      return;
    }
    if (this.#expression === 'a/b') {
      this.#host.innerHTML = [
        '<span data-token-id="numerator">a</span>',
        '<span data-token-id="fraction">/</span>',
        '<span data-token-id="denominator">b</span>',
      ].join(' ');
      return;
    }
    if (this.#expression === 'a ÷ b') {
      this.#host.innerHTML = [
        '<span data-token-id="left">a</span>',
        '<span data-token-id="divide">÷</span>',
        '<span data-token-id="right">b</span>',
      ].join(' ');
      return;
    }
    this.#host.textContent = this.#expression;
  }

  #emit(event: 'hover' | 'select' | 'state', payload: unknown): void {
    for (const cb of this.#listeners[event]) {
      cb(payload);
    }
  }
}

const createHostWithActions = () => {
  const host = document.createElement('div');
  const actions = document.createElement('div');
  host.dataset.role = 'math-host';
  actions.dataset.role = 'math-actions';
  document.body.append(host, actions);
  return { host, actions };
};

describe('math bridge keymap and selection wiring', () => {
  let domWindow: Window;
  let bridge: MathBridgeHandle | null = null;
  let engine: MockKeymapEngine;

  beforeEach(() => {
    domWindow = new Window();
    globalThis.window = domWindow as unknown as typeof globalThis.window;
    globalThis.document = domWindow.document as unknown as typeof globalThis.document;
    globalThis.navigator = domWindow.navigator as unknown as typeof globalThis.navigator;
    globalThis.HTMLElement = domWindow.HTMLElement as unknown as typeof globalThis.HTMLElement;
    globalThis.MouseEvent = domWindow.MouseEvent as unknown as typeof globalThis.MouseEvent;
    if (domWindow.PointerEvent) {
      globalThis.PointerEvent = domWindow.PointerEvent as unknown as typeof globalThis.PointerEvent;
    }
  });

  afterEach(() => {
    document.body.innerHTML = '';
    if (bridge) {
      bridge.destroy();
      bridge = null;
    }
    delete (globalThis as any).window;
    delete (globalThis as any).document;
    delete (globalThis as any).navigator;
    delete (globalThis as any).HTMLElement;
    delete (globalThis as any).MouseEvent;
    delete (globalThis as any).PointerEvent;
    vi.useRealTimers();
  });

  it('routes ladder keys to engine.select', () => {
    const { host } = createHostWithActions();
    engine = new MockKeymapEngine({
      initial: '2+3',
      actions: [],
    });

    const originalWindowAdd = domWindow.addEventListener.bind(domWindow) as unknown as (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: unknown,
    ) => void;
    const keydownHandlers: EventListener[] = [];
    (domWindow as unknown as {
      addEventListener: (type: string, listener: EventListenerOrEventListenerObject, options?: unknown) => void;
    }).addEventListener = (type: string, listener: EventListenerOrEventListenerObject, options?: unknown) => {
      originalWindowAdd(type, listener, options);
      if (type === 'keydown' && typeof listener === 'function') {
        keydownHandlers.push(listener);
      }
    };

    bridge = attachMathEngine({}, engine, host, {
      initialExpression: '2+3',
    });

    (domWindow as unknown as { addEventListener: typeof originalWindowAdd }).addEventListener = originalWindowAdd;

    expect(keydownHandlers.length).toBeGreaterThan(0);

    const triggerKey = (key: string) => {
      const event = new domWindow.KeyboardEvent('keydown', { key, bubbles: true });
      for (const handler of keydownHandlers) {
        handler.call(domWindow, event as unknown as Event);
      }
    };

    triggerKey('[');
    triggerKey(']');

    expect(engine.selectHistory).toEqual(['scopeDown', 'scopeUp']);
  });

  it('supports Ctrl/⌘ multi-select and updates token highlight', () => {
    const { host } = createHostWithActions();
    engine = new MockKeymapEngine({
      initial: '2+3',
      actions: [],
    });

    const originalHostAdd = host.addEventListener.bind(host) as (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: unknown,
    ) => void;
    const clickHandlers: EventListener[] = [];
    (host as unknown as { addEventListener: (type: string, listener: EventListenerOrEventListenerObject, options?: unknown) => void }).addEventListener = (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: unknown,
    ) => {
      originalHostAdd(type, listener, options);
      if (type === 'click' && typeof listener === 'function') {
        clickHandlers.push(listener);
      }
    };

    bridge = attachMathEngine({}, engine, host, {
      initialExpression: '2+3',
    });

    (host as unknown as { addEventListener: typeof originalHostAdd }).addEventListener = originalHostAdd;

    const leftToken = host.querySelector('[data-token-id="left"]') as HTMLElement;
    expect(leftToken).toBeTruthy();
    expect(leftToken.dataset.tokenId).toBe('left');
    expect(leftToken.parentElement).toBe(host);
    expect(clickHandlers.length).toBeGreaterThan(0);

    const invokeClick = (event: Event) => {
      Object.defineProperty(event, 'target', { value: leftToken, configurable: true });
      for (const handler of clickHandlers) {
        handler.call(host, event);
      }
    };

    invokeClick(new domWindow.MouseEvent('click', { bubbles: true, ctrlKey: true }) as unknown as Event);
    expect(host.dataset.selectionMode).toBe('multi');
    expect(engine.selectHistory.at(-1)).toBe('add');

    engine.emitSelect(['left']);
    expect(leftToken.classList.contains('math-token--selected')).toBe(true);

    invokeClick(new domWindow.MouseEvent('click', { bubbles: true, metaKey: true }) as unknown as Event);
    expect(engine.selectHistory.at(-1)).toBe('remove');
  });

  it('enables long-press selection for touch pointers', () => {
    vi.useFakeTimers();
    (domWindow as unknown as { setTimeout: typeof setTimeout }).setTimeout = setTimeout;
    (domWindow as unknown as { clearTimeout: typeof clearTimeout }).clearTimeout = clearTimeout;
    const { host } = createHostWithActions();
    engine = new MockKeymapEngine({
      initial: '2+3',
      actions: [],
    });

    const originalHostAdd = host.addEventListener.bind(host) as (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: unknown,
    ) => void;
    const pointerHandlers: Record<string, EventListener[]> = {
      pointerdown: [],
      pointerup: [],
      pointercancel: [],
      pointerleave: [],
    };
    (host as unknown as { addEventListener: (type: string, listener: EventListenerOrEventListenerObject, options?: unknown) => void }).addEventListener = (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: unknown,
    ) => {
      originalHostAdd(type, listener, options);
      if (type in pointerHandlers && typeof listener === 'function') {
        pointerHandlers[type].push(listener);
      }
    };

    bridge = attachMathEngine({}, engine, host, {
      initialExpression: '2+3',
    });

    (host as unknown as { addEventListener: typeof originalHostAdd }).addEventListener = originalHostAdd;

    const leftToken = host.querySelector('[data-token-id="left"]') as HTMLElement;
    const PointerCtor = (domWindow as unknown as { PointerEvent?: typeof PointerEvent }).PointerEvent
      ?? domWindow.MouseEvent;

    const invokePointer = (type: keyof typeof pointerHandlers, event: Event) => {
      Object.defineProperty(event, 'target', { value: leftToken, configurable: true });
      for (const handler of pointerHandlers[type]) {
        handler.call(host, event);
      }
    };

    invokePointer('pointerdown', new PointerCtor('pointerdown', { bubbles: true, pointerType: 'touch' }) as unknown as Event);

    vi.advanceTimersByTime(500);
    expect(engine.selectHistory.at(-1)).toBe('add');
    expect(host.dataset.selectionMode).toBe('multi');

    invokePointer('pointerup', new PointerCtor('pointerup', { bubbles: true, pointerType: 'touch' }) as unknown as Event);
    expect(host.dataset.selectionMode).toBeUndefined();
  });

  it('applies highlighted actions with Enter and clears selection on Escape', () => {
    const { host, actions } = createHostWithActions();
    engine = new MockKeymapEngine({
      initial: '2+3',
      actions: [
        { id: 'A1', label: 'A1 · simplify', kind: 'transform' },
        { id: 'B4', label: 'B4 · combine like terms', kind: 'transform' },
        { id: 'C6', label: 'C6 · distribute', kind: 'transform' },
        { id: 'C7', label: 'C7 · factor', kind: 'transform' },
        { id: 'D9', label: 'D9 · divide', kind: 'transform' },
      ],
      transitions: {
        A1: '5',
        B4: '5x',
        C6: 'ab+ac',
        C7: 'a(b+c)',
        D9: 'a ÷ b',
      },
    });

    const originalWindowAdd = domWindow.addEventListener.bind(domWindow) as unknown as (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: unknown,
    ) => void;
    const keydownHandlers: EventListener[] = [];
    (domWindow as unknown as {
      addEventListener: (type: string, listener: EventListenerOrEventListenerObject, options?: unknown) => void;
    }).addEventListener = (type: string, listener: EventListenerOrEventListenerObject, options?: unknown) => {
      originalWindowAdd(type, listener, options);
      if (type === 'keydown' && typeof listener === 'function') {
        keydownHandlers.push(listener);
      }
    };

    bridge = attachMathEngine({}, engine, host, {
      initialExpression: '2+3',
      actionsContainer: actions,
    });

    (domWindow as unknown as { addEventListener: typeof originalWindowAdd }).addEventListener = originalWindowAdd;

    const triggerKey = (key: string) => {
      const event = new domWindow.KeyboardEvent('keydown', { key, bubbles: true });
      for (const handler of keydownHandlers) {
        handler.call(domWindow, event as unknown as Event);
      }
    };

    triggerKey('Enter');
    expect(engine.applied.at(-1)).toBe('A1');

    const actionsRoot = actions.querySelector('[data-role="math-actions-list"]');
    expect(actionsRoot).toBeTruthy();

    const highlightAndApply = (id: string) => {
      const button = actions.querySelector<HTMLButtonElement>(`[data-action-id="${id}"]`);
      expect(button).toBeTruthy();
      button?.focus();
      triggerKey('Enter');
      expect(engine.applied.at(-1)).toBe(id);
    };

    highlightAndApply('B4');
    highlightAndApply('C6');
    highlightAndApply('C7');
    highlightAndApply('D9');

    engine.emitSelect(['left', 'right']);
    triggerKey('Escape');
    expect(engine.selectHistory.at(-1)).toBe('clear');
  });
});
