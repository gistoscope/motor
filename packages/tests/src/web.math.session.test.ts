import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { Window } from 'happy-dom';

import { attachMathEngine } from '../../web/src/math/bridge';
import { createMathSession, withMathSession } from '../../web/src/math/session';
import type {
  MathBridgeHandle,
  MathEngine,
  MathEngineAction,
  MathEngineEventCallback,
} from '../../web/src/math/types';

class MockSessionEngine implements MathEngine {
  #host: HTMLElement | null = null;
  #listeners: Record<'hover' | 'select' | 'state', Set<MathEngineEventCallback>> = {
    hover: new Set(),
    select: new Set(),
    state: new Set(),
  };
  #history: string[] = [];
  #index = 0;
  applied: string[] = [];

  mount(host: HTMLElement, initial: string): void {
    this.#host = host;
    this.#history = [];
    this.#index = this.#resolveInitial(initial);
    this.#render();
    this.#emitState(null);
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
    const actions: MathEngineAction[] = [];
    if (this.#index === 0) {
      actions.push({ id: 'A1', label: 'A1 · simplify', kind: 'transform' });
    }
    if (this.#index === 1) {
      actions.push({ id: 'B4', label: 'B4 · combine like terms', kind: 'transform' });
    }
    if (this.#index > 0) {
      actions.push({ id: 'undo', label: 'Undo', kind: 'history' });
    }
    if (this.#index < this.#history.length) {
      actions.push({ id: 'redo', label: 'Redo', kind: 'history' });
    }
    return actions;
  }

  apply(actionId: string): void {
    this.applied.push(actionId);
    if (actionId === 'undo') {
      if (this.#index > 0) {
        this.#index -= 1;
        this.#render();
        this.#emitState('undo');
      }
      return;
    }

    if (actionId === 'redo') {
      if (this.#index < this.#history.length) {
        this.#index += 1;
        this.#render();
        this.#emitState('redo');
      }
      return;
    }

    if (actionId === 'A1') {
      if (this.#index !== this.#history.length) {
        this.#history.splice(this.#index);
      }
      this.#history.push('A1');
      this.#index = this.#history.length;
      this.#render();
      this.#emitState('rule:A1');
      return;
    }

    if (actionId === 'B4') {
      if (this.#index === 0) {
        return;
      }
      if (this.#index !== this.#history.length) {
        this.#history.splice(this.#index);
      }
      this.#history.push('B4');
      this.#index = this.#history.length;
      this.#render();
      this.#emitState('rule:B4');
    }
  }

  export(): { ast: unknown; html?: string; tex?: string } {
    return {
      ast: { expression: this.#expressionForIndex(this.#index) },
      html: this.#host?.innerHTML ?? undefined,
    };
  }

  #resolveInitial(initial: string): number {
    if (initial.trim() === 'x') {
      return 0;
    }
    if (initial.trim() === 'x + 1') {
      this.#history = ['A1'];
      return 1;
    }
    if (initial.trim() === 'x + 4') {
      this.#history = ['A1', 'B4'];
      return 2;
    }
    return 0;
  }

  #expressionForIndex(index: number): string {
    if (index === 0) {
      return 'x';
    }
    if (index === 1) {
      return 'x + 1';
    }
    return 'x + 4';
  }

  #htmlForIndex(index: number): string {
    if (index === 0) {
      return '<span data-token-id="var">x</span>';
    }
    if (index === 1) {
      return [
        '<span data-token-id="var">x</span>',
        '<span data-token-id="plus">+</span>',
        '<span data-token-id="one">1</span>',
      ].join(' ');
    }
    return [
      '<span data-token-id="var">x</span>',
      '<span data-token-id="plus">+</span>',
      '<span data-token-id="number">4</span>',
    ].join(' ');
  }

  #render(): void {
    if (!this.#host) {
      return;
    }
    this.#host.innerHTML = this.#htmlForIndex(this.#index);
  }

  #emitState(ruleId: string | null): void {
    const payload = {
      ruleId,
      legalActions: this.getLegalActions(),
      expression: this.#expressionForIndex(this.#index),
    };
    this.#emit('state', payload);
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

describe('math session export/import', () => {
  let domWindow: Window;
  let bridge: MathBridgeHandle | null = null;

  beforeEach(() => {
    domWindow = new Window();
    globalThis.window = domWindow as unknown as typeof globalThis.window;
    globalThis.document = domWindow.document as unknown as typeof globalThis.document;
    globalThis.navigator = domWindow.navigator as unknown as typeof globalThis.navigator;
    globalThis.HTMLElement = domWindow.HTMLElement as unknown as typeof globalThis.HTMLElement;
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
  });

  it('replays exported logs deterministically', async () => {
    const { host, actions } = createHostWithActions();
    const engine = new MockSessionEngine();
    const { engine: sessionEngine, session } = withMathSession(engine);

    bridge = attachMathEngine({}, sessionEngine, host, {
      initialExpression: 'x',
      actionsContainer: actions,
    });

    const getActionButton = (id: string) =>
      actions.querySelector<HTMLButtonElement>(`[data-action-id="${id}"]`);

    const click = (id: string) => {
      const button = getActionButton(id);
      expect(button).toBeTruthy();
      button?.click();
    };

    click('A1');
    click('B4');
    click('undo');
    click('redo');

    expect(session.actions).toEqual(['A1', 'B4', 'undo', 'redo']);

    const exported = session.export();
    expect(exported).toEqual({ version: 1, actions: ['A1', 'B4', 'undo', 'redo'] });
    const serialized = JSON.stringify(exported);

    const controls = actions.querySelector('[data-role="math-session-controls"]');
    expect(controls).toBeTruthy();
    expect(controls?.querySelector('[data-role="math-session-export"]')).toBeTruthy();
    expect(controls?.querySelector('[data-role="math-session-import"]')).toBeTruthy();
    expect(controls?.querySelector('[data-role="math-session-replay"]')).toBeTruthy();

    const originalSnapshot = sessionEngine.export();

    const replayEngine = new MockSessionEngine();
    const { engine: replayProxy, session: replaySession } = withMathSession(
      replayEngine,
      createMathSession(),
    );
    replaySession.import(serialized);

    const { host: replayHost, actions: replayActions } = createHostWithActions();
    const replayBridge = attachMathEngine({}, replayProxy, replayHost, {
      initialExpression: 'x',
      actionsContainer: replayActions,
    });

    let importedSnapshot: ReturnType<MathEngine['export']>;
    let replayHtml = '';
    try {
      await replaySession.replay((actionId) => {
        replayProxy.apply(actionId);
      });
      replayHtml = replayHost.innerHTML;
      importedSnapshot = replayProxy.export();
    } finally {
      replayBridge.destroy();
    }

    expect(importedSnapshot.ast).toEqual(originalSnapshot.ast);
    expect(importedSnapshot.html).toBe(originalSnapshot.html);
    expect(replayHtml).toBe(host.innerHTML);
    expect(replaySession.export()).toEqual(exported);
  });
});
