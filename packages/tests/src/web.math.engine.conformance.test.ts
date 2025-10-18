import { afterEach, beforeEach } from 'vitest';
import { Window } from 'happy-dom';

import { describeMathEngineContract } from '../../web/src/math/conformance';
import type {
  MathEngine,
  MathEngineAction,
  MathEngineEventCallback,
  MathEngineEventName,
} from '../../web/src/math/types';

let domWindow: Window | null = null;

beforeEach(() => {
  domWindow = new Window();
  const api = domWindow as unknown as typeof globalThis & Window;
  global.window = api;
  global.document = domWindow.document;
  global.HTMLElement = domWindow.HTMLElement;
  global.Node = domWindow.Node;
});

afterEach(() => {
  domWindow?.happyDOM.cancelAsync();
  domWindow = null;
  // @ts-expect-error -- vitest environment cleanup
  delete global.window;
  // @ts-expect-error -- vitest environment cleanup
  delete global.document;
  // @ts-expect-error -- vitest environment cleanup
  delete global.HTMLElement;
  // @ts-expect-error -- vitest environment cleanup
  delete global.Node;
});

class ContractMockEngine implements MathEngine {
  #host: HTMLElement | null = null;
  #expression = '';
  #listeners: Record<MathEngineEventName, Set<MathEngineEventCallback>> = {
    hover: new Set(),
    select: new Set(),
    state: new Set(),
  };

  mount(host: HTMLElement, initial: string): void {
    this.#host = host;
    this.#expression = initial;
    this.#render();
    this.#emit('state', { expression: this.#expression, legalActions: this.getLegalActions() });
  }

  on(event: MathEngineEventName, cb: MathEngineEventCallback): () => void {
    this.#listeners[event].add(cb);
    return () => {
      this.#listeners[event].delete(cb);
    };
  }

  getLegalActions(): MathEngineAction[] {
    const actions: MathEngineAction[] = [
      { id: 'simplify', label: 'Simplify expression', kind: 'transform' },
    ];
    if (this.#expression !== 'x') {
      actions.push({ id: 'reset', label: 'Reset to x', kind: 'history' });
    }
    return actions;
  }

  apply(actionId: string): void {
    if (actionId === 'simplify') {
      this.#expression = '1';
    } else if (actionId === 'reset') {
      this.#expression = 'x';
    }
    this.#render();
    this.#emit('state', { expression: this.#expression, legalActions: this.getLegalActions() });
  }

  export(): { ast: unknown; html?: string; tex?: string } {
    return {
      ast: { expression: this.#expression },
      html: this.#host?.innerHTML,
      tex: this.#expression,
    };
  }

  #emit(event: MathEngineEventName, payload: unknown): void {
    for (const listener of this.#listeners[event]) {
      listener(payload);
    }
  }

  #render(): void {
    if (!this.#host) {
      return;
    }
    this.#host.innerHTML = `<span data-token-id="expr">${this.#expression}</span>`;
  }
}

describeMathEngineContract({
  name: 'mock contract implementation',
  createEngine: () => new ContractMockEngine(),
  initialExpression: 'x',
});
