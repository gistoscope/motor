import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { Window } from 'happy-dom';

import { attachMathEngine } from '../../web/src/math/bridge';
import { fromRealEngine } from '../../web/src/math/engineAdapter';
import type { MathBridgeHandle, MathEngine, MathEngineAction, MathEngineEventCallback } from '../../web/src/math/types';

class MockMathEngine implements MathEngine {
  #host: HTMLElement | null = null;
  #expression = '';
  #listeners: Record<'hover' | 'select' | 'state', Set<MathEngineEventCallback>> = {
    hover: new Set(),
    select: new Set(),
    state: new Set(),
  };
  applied: string[] = [];

  mount(host: HTMLElement, initial: string): void {
    this.#host = host;
    this.#expression = initial;
    this.#render();
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
    if (this.#expression === '2+3') {
      return [
        { id: 'simplify', label: 'Simplify', kind: 'transform' },
        { id: 'factor', label: 'Factor', kind: 'transform' },
      ];
    }
    return [];
  }

  apply(actionId: string): void {
    this.applied.push(actionId);
    if (actionId === 'simplify') {
      this.#expression = '5';
      this.#render();
      this.#emit('state', { expression: this.#expression });
    }
  }

  export(): { ast: unknown; html?: string | undefined; tex?: string | undefined } {
    return {
      ast: { expression: this.#expression },
      html: this.#host?.innerHTML,
    };
  }

  emitHover(payload: unknown): void {
    this.#emit('hover', payload);
  }

  emitSelect(payload: unknown): void {
    this.#emit('select', payload);
  }

  #emit(event: 'hover' | 'select' | 'state', payload: unknown): void {
    for (const cb of this.#listeners[event]) {
      cb(payload);
    }
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
    } else {
      this.#host.innerHTML = '<span data-token-id="result">5</span>';
    }
  }
}

class FakeRealMathEngine {
  #host: HTMLElement | null = null;
  #expression = '';
  #listeners: Record<'hover' | 'select' | 'state', Set<MathEngineEventCallback>> = {
    hover: new Set(),
    select: new Set(),
    state: new Set(),
  };
  applied: string[] = [];

  mount(host: HTMLElement, initial?: unknown): void {
    this.#host = host;
    if (typeof initial === 'string') {
      this.#expression = initial;
    } else if (initial && typeof initial === 'object') {
      const maybe = (initial as { expression?: unknown }).expression;
      if (typeof maybe === 'string') {
        this.#expression = maybe;
      }
    }
    this.#render();
    this.#emit('state', { legalActions: this.listActions() });
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

  listActions(): Array<{ actionId: string; title: string; type: string }> {
    if (this.#expression === '2+3') {
      return [
        { actionId: 'simplify', title: 'Simplify', type: 'transform' },
        { actionId: 'factor', title: 'Factor', type: 'transform' },
      ];
    }
    return [];
  }

  apply(actionId: string): void {
    this.applied.push(actionId);
    if (actionId === 'simplify') {
      this.#expression = '5';
      this.#render();
      this.#emit('state', { legalActions: this.listActions() });
    }
  }

  export(): { ast: unknown; html?: string } {
    return {
      ast: { expression: this.#expression },
      html: this.#host?.innerHTML,
    };
  }

  emitHover(payload: unknown): void {
    this.#emit('hover', payload);
  }

  emitSelect(payload: unknown): void {
    this.#emit('select', payload);
  }

  #emit(event: 'hover' | 'select' | 'state', payload: unknown): void {
    for (const cb of this.#listeners[event]) {
      cb(payload);
    }
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
    } else {
      this.#host.innerHTML = '<span data-token-id="result">5</span>';
    }
  }
}

describe('math bridge', () => {
  let domWindow: Window;
  let bridge: MathBridgeHandle | null = null;

  beforeEach(() => {
    domWindow = new Window();
    globalThis.window = domWindow as unknown as typeof globalThis.window;
    globalThis.document = domWindow.document as unknown as typeof globalThis.document;
    globalThis.navigator = domWindow.navigator as unknown as typeof globalThis.navigator;
    bridge = null;
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
  });

  it('wires engine events, actions panel and apply flow', () => {
    const engine = new MockMathEngine();
    const viewerStub = { name: 'viewer' };
    const host = document.createElement('div');
    const actionsHost = document.createElement('div');
    document.body.append(host, actionsHost);

    bridge = attachMathEngine(viewerStub, engine, host, {
      initialExpression: '2+3',
      actionsContainer: actionsHost,
    });

    const actionButtons = actionsHost.querySelectorAll<HTMLButtonElement>('button[data-role="math-action"]');
    expect(actionButtons.length).toBe(2);
    expect(actionButtons[0].textContent).toBe('Simplify');
    expect(actionButtons[1].textContent).toBe('Factor');

    engine.emitHover({ ids: ['left'] });
    const leftToken = host.querySelector('[data-token-id="left"]');
    expect(leftToken?.classList.contains('math-token--hovered')).toBe(true);

    engine.emitSelect('right');
    const rightToken = host.querySelector('[data-token-id="right"]');
    expect(rightToken?.classList.contains('math-token--selected')).toBe(true);

    actionButtons[0].click();
    expect(engine.applied).toEqual(['simplify']);

    const resultToken = host.querySelector('[data-token-id="result"]');
    expect(resultToken?.textContent).toBe('5');

    const refreshedButtons = actionsHost.querySelectorAll<HTMLButtonElement>('button[data-role="math-action"]');
    expect(refreshedButtons.length).toBe(0);
    const emptyState = actionsHost.querySelector('[data-role="math-actions-empty"]');
    expect(emptyState?.textContent).toBe('No actions available');

    bridge?.setExpression('2+3');
    const resetButtons = actionsHost.querySelectorAll<HTMLButtonElement>('button[data-role="math-action"]');
    expect(resetButtons.length).toBe(2);
  });

  it('adapts a real engine via fromRealEngine', () => {
    const real = new FakeRealMathEngine();
    const engine = fromRealEngine(real);
    const viewerStub = { name: 'viewer' };
    const host = document.createElement('div');
    const actionsHost = document.createElement('div');
    document.body.append(host, actionsHost);

    bridge = attachMathEngine(viewerStub, engine, host, {
      initialExpression: '2+3',
      actionsContainer: actionsHost,
    });

    const initialActions = engine.getLegalActions();
    expect(initialActions.map((action) => action.id)).toEqual(['simplify', 'factor']);
    expect(initialActions[0]?.label).toBe('Simplify');
    expect(initialActions[0]?.kind).toBe('transform');

    real.emitHover({ tokens: ['left'] });
    const leftToken = host.querySelector('[data-token-id="left"]');
    expect(leftToken?.classList.contains('math-token--hovered')).toBe(true);

    real.emitSelect('right');
    const rightToken = host.querySelector('[data-token-id="right"]');
    expect(rightToken?.classList.contains('math-token--selected')).toBe(true);

    const actionButtons = actionsHost.querySelectorAll<HTMLButtonElement>('button[data-role="math-action"]');
    expect(actionButtons.length).toBe(2);
    actionButtons[0].click();

    expect(real.applied).toEqual(['simplify']);

    const resultToken = host.querySelector('[data-token-id="result"]');
    expect(resultToken?.textContent).toBe('5');

    expect(engine.getLegalActions()).toEqual([]);

    const refreshedButtons = actionsHost.querySelectorAll<HTMLButtonElement>('button[data-role="math-action"]');
    expect(refreshedButtons.length).toBe(0);

    const exported = engine.export();
    expect(exported.ast).toEqual({ expression: '5' });
    expect(exported.html).toContain('data-token-id="result"');

    bridge?.setExpression('2+3');
    const resetButtons = actionsHost.querySelectorAll<HTMLButtonElement>('button[data-role="math-action"]');
    expect(resetButtons.length).toBe(2);
  });
});
