import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Window } from 'happy-dom';

import { attachMathEngine } from '../../web/src/math/bridge';
import { fromRealEngine } from '../../web/src/math/engineAdapter';
import type { MathBridgeHandle } from '../../web/src/math/types';

type ListenerMap = Record<'hover' | 'select' | 'state', Set<(payload: unknown) => void>>;

class StubRealMathEngine {
  #host: HTMLElement | null = null;
  #expression = '';
  #view = '';
  #listeners: ListenerMap = {
    hover: new Set(),
    select: new Set(),
    state: new Set(),
  };

  mount(host: HTMLElement, initial: unknown): void {
    this.#host = host;
    const initialExpression =
      typeof initial === 'string'
        ? initial
        : typeof initial === 'object' && initial !== null && 'expression' in (initial as Record<string, unknown>)
          ? String((initial as { expression?: unknown }).expression ?? '')
          : '';
    this.#applyExpression(initialExpression);
  }

  on(event: 'hover' | 'select' | 'state', cb: (payload: unknown) => void): () => void {
    this.#listeners[event].add(cb);
    return () => {
      this.#listeners[event].delete(cb);
    };
  }

  getLegalActions() {
    const normalized = this.#expression.replace(/\s+/g, '');
    if (normalized === '2+3') {
      return [
        { id: 'simplify', label: 'Simplify', kind: 'transform' as const },
      ];
    }
    return [];
  }

  execute(actionId: string): void {
    const normalized = this.#expression.replace(/\s+/g, '');
    if (normalized === '2+3' && actionId === 'simplify') {
      this.#applyExpression('5');
      return;
    }
    throw new Error(`Unsupported action: ${actionId}`);
  }

  exportState(): { ast: unknown; html?: string; tex?: string } {
    return {
      ast: { expression: this.#expression },
      html: this.#view,
      tex: this.#expression,
    };
  }

  #applyExpression(expression: string): void {
    this.#expression = expression.trim();
    this.#render();
    this.#emit('state', { view: this.#view, legalActions: this.getLegalActions() });
  }

  #render(): void {
    if (!this.#host) {
      return;
    }
    const normalized = this.#expression.replace(/\s+/g, '');
    if (!normalized) {
      this.#host.innerHTML = '';
      this.#view = '';
      return;
    }
    if (normalized === '2+3') {
      this.#host.innerHTML = [
        '<span data-token-id="left">2</span>',
        '<span data-token-id="op">+</span>',
        '<span data-token-id="right">3</span>',
      ].join(' ');
    } else {
      this.#host.innerHTML = `<span data-token-id="expr">${this.#expression}</span>`;
    }
    this.#view = this.#host.innerHTML;
  }

  #emit(event: 'hover' | 'select' | 'state', payload: unknown): void {
    for (const listener of this.#listeners[event]) {
      listener(payload);
    }
  }
}

describe('web bridge conformance', () => {
  let domWindow: Window;
  let bridge: MathBridgeHandle | null = null;
  let real: StubRealMathEngine;
  let engine: ReturnType<typeof fromRealEngine>;
  let host: HTMLElement;
  let actionsHost: HTMLElement;

  beforeEach(() => {
    domWindow = new Window();
    globalThis.window = domWindow as unknown as typeof globalThis.window;
    globalThis.document = domWindow.document as unknown as typeof globalThis.document;
    globalThis.navigator = domWindow.navigator as unknown as typeof globalThis.navigator;
    globalThis.HTMLElement = domWindow.HTMLElement as unknown as typeof globalThis.HTMLElement;

    host = document.createElement('div');
    actionsHost = document.createElement('div');
    document.body.append(host, actionsHost);

    real = new StubRealMathEngine();
    engine = fromRealEngine(real);
    bridge = attachMathEngine(null, engine, host, { actionsContainer: actionsHost });
  });

  afterEach(() => {
    if (bridge) {
      bridge.destroy();
      bridge = null;
    }
    document.body.innerHTML = '';
    delete (globalThis as any).HTMLElement;
    delete (globalThis as any).navigator;
    delete (globalThis as any).document;
    delete (globalThis as any).window;
  });

  const parse = (expression: string) => {
    bridge!.setExpression(expression);
    const snapshot = real.exportState();
    return {
      view: snapshot.html ?? '',
      legalActions: engine.getLegalActions(),
    };
  };

  const execute = (actionId: string) => {
    try {
      engine.apply(actionId);
      return { ok: true as const };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false as const, message };
    }
  };

  it('produces a view and action list when parsing an expression', () => {
    const state = parse('2+3');
    expect(state.view).toContain('data-token-id="left"');
    expect(state.view).toContain('data-token-id="right"');
    expect(Array.isArray(state.legalActions)).toBe(true);
    expect(state.legalActions.map((action) => action.id)).toEqual(['simplify']);
  });

  it('reports a meaningful error when executing an unknown action', () => {
    const result = execute('bad');
    expect(result.ok).toBe(false);
    expect(result.message).toContain('bad');
    expect(result.message).toContain('Unsupported action');
  });
});
