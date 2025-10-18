import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { Window } from 'happy-dom';

import { attachMathEngine } from '../../web/src/math/bridge';
import type {
  MathBridgeHandle,
  MathEngine,
  MathEngineAction,
  MathEngineEventCallback,
} from '../../web/src/math/types';

class PreviewMathEngine implements MathEngine {
  #host: HTMLElement | null = null;
  #expression = '';
  #listeners: Record<'hover' | 'select' | 'state', Set<MathEngineEventCallback>> = {
    hover: new Set(),
    select: new Set(),
    state: new Set(),
  };
  previewCalls: Array<string | null> = [];

  mount(host: HTMLElement, initial: string): void {
    this.#host = host;
    this.#expression = initial;
    this.#render();
    this.#emit('state', { legalActions: this.getLegalActions() });
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
    if (actionId === 'simplify') {
      this.#expression = '5';
    }
    this.#render();
    this.#emit('state', { ruleId: actionId, legalActions: this.getLegalActions() });
  }

  export(): { ast: unknown; html?: string; tex?: string } {
    return {
      ast: { expression: this.#expression },
      html: this.#host?.innerHTML,
      tex: undefined,
    };
  }

  preview(actionId: string | null): void {
    this.previewCalls.push(actionId);
    if (!actionId) {
      this.#emit('state', { preview: null });
      return;
    }
    const tokens = actionId === 'simplify' ? ['left', 'right'] : ['op'];
    this.#emit('state', { preview: { actionId, tokens } });
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
      return;
    }
    this.#host.innerHTML = '<span data-token-id="result">5</span>';
  }
}

describe('math guidance overlays', () => {
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
    delete (globalThis as { window?: typeof globalThis.window }).window;
    delete (globalThis as { document?: typeof globalThis.document }).document;
    delete (globalThis as { navigator?: typeof globalThis.navigator }).navigator;
  });

  it('shows ghost previews and tooltips for math actions', () => {
    const engine = new PreviewMathEngine();
    const host = document.createElement('div');
    const actionsHost = document.createElement('div');
    document.body.append(host, actionsHost);

    bridge = attachMathEngine({ name: 'viewer' }, engine, host, {
      initialExpression: '2+3',
      actionsContainer: actionsHost,
    });

    const simplifyButton = actionsHost.querySelector<HTMLButtonElement>(
      'button[data-role="math-action"][data-action-id="simplify"]',
    );
    expect(simplifyButton).not.toBeNull();
    expect(simplifyButton?.title).toBe(
      'Simplify — Reduce the expression to an equivalent but simpler form.',
    );

    engine.preview('simplify');
    expect(engine.previewCalls).toEqual(['simplify']);

    const ghostLayer = host.querySelector<HTMLElement>('.motor-ghost');
    expect(ghostLayer?.dataset.state).toBe('visible');
    const overlayTokens = Array.from(
      ghostLayer?.querySelectorAll<HTMLElement>('[data-role="motor-ghost-token"]') ?? [],
    ).map((node) => node.dataset.tokenId ?? '');
    expect(new Set(overlayTokens)).toEqual(new Set(['left', 'right']));
    expect(overlayTokens.length).toBeGreaterThanOrEqual(2);

    engine.preview(null);
    expect(engine.previewCalls).toEqual(['simplify', null]);
    expect(ghostLayer?.dataset.state).toBe('hidden');
  });
});
