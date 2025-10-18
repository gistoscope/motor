import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { Window } from 'happy-dom';

import { attachMathEngine } from '../../web/src/math/bridge';
import type {
  MathBridgeHandle,
  MathEngine,
  MathEngineAction,
  MathEngineEventCallback,
} from '../../web/src/math/types';

interface MockState {
  expression: string;
  domainNotes: string[];
  ruleId: string | null;
}

class MockHistoryEngine implements MathEngine {
  #host: HTMLElement | null = null;
  #listeners: Record<'hover' | 'select' | 'state', Set<MathEngineEventCallback>> = {
    hover: new Set(),
    select: new Set(),
    state: new Set(),
  };
  #states: MockState[];
  #index = 0;
  #furthestIndex = 0;
  applied: string[] = [];

  constructor(states: MockState[]) {
    this.#states = states;
  }

  mount(host: HTMLElement, initial: string): void {
    this.#host = host;
    const nextIndex = this.#states.findIndex((state) => state.expression === initial);
    this.#index = nextIndex >= 0 ? nextIndex : 0;
    this.#furthestIndex = this.#index;
    this.#render();
    this.#emit('state', {
      ruleId: this.#states[this.#index]?.ruleId ?? null,
      domainNotes: this.#states[this.#index]?.domainNotes ?? [],
    });
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
    if (this.#index > 0) {
      actions.push({ id: 'undo', label: 'Undo', kind: 'history' });
    }
    if (this.#index < this.#states.length - 1) {
      actions.push({ id: 'advance', label: 'Next step', kind: 'transform' });
    }
    if (this.#index < this.#furthestIndex) {
      actions.push({ id: 'redo', label: 'Redo', kind: 'history' });
    }
    return actions;
  }

  apply(actionId: string): void {
    this.applied.push(actionId);
    if (actionId === 'advance') {
      if (this.#index < this.#states.length - 1) {
        this.#index += 1;
        this.#furthestIndex = Math.max(this.#furthestIndex, this.#index);
        this.#render();
        const current = this.#states[this.#index];
        this.#emit('state', {
          ruleId: current?.ruleId ?? null,
          domainNotes: current?.domainNotes ?? [],
        });
      }
      return;
    }

    if (actionId === 'undo') {
      if (this.#index > 0) {
        this.#index -= 1;
        this.#render();
        const current = this.#states[this.#index];
        this.#emit('state', {
          ruleId: 'undo',
          domainNotes: current?.domainNotes ?? [],
        });
      }
      return;
    }

    if (actionId === 'redo') {
      if (this.#index < this.#furthestIndex) {
        this.#index += 1;
        this.#render();
        const current = this.#states[this.#index];
        this.#emit('state', {
          ruleId: 'redo',
          domainNotes: current?.domainNotes ?? [],
        });
      }
    }
  }

  export(): { ast: unknown; html?: string | undefined; tex?: string | undefined } {
    return {
      ast: { expression: this.#states[this.#index]?.expression ?? '' },
      html: this.#host?.innerHTML,
    };
  }

  #render(): void {
    if (!this.#host) {
      return;
    }
    this.#host.textContent = this.#states[this.#index]?.expression ?? '';
  }

  #emit(event: 'hover' | 'select' | 'state', payload: unknown): void {
    for (const cb of this.#listeners[event]) {
      cb(payload);
    }
  }
}

describe('math history integration', () => {
  let domWindow: Window;
  let bridge: MathBridgeHandle | null = null;
  let engine: MockHistoryEngine;

  beforeEach(() => {
    domWindow = new Window();
    globalThis.window = domWindow as unknown as typeof globalThis.window;
    globalThis.document = domWindow.document as unknown as typeof globalThis.document;
    globalThis.navigator = domWindow.navigator as unknown as typeof globalThis.navigator;
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

  it('captures engine history and domain warnings', () => {
    engine = new MockHistoryEngine([
      { expression: 'x', domainNotes: [], ruleId: null },
      { expression: 'x + 1', domainNotes: ['b ≠ 0'], ruleId: 'rule:add-one' },
      { expression: 'x + 2', domainNotes: [], ruleId: 'rule:add-one' },
    ]);

    const host = document.createElement('div');
    const historyContainer = document.createElement('div');
    const warningsContainer = document.createElement('div');
    document.body.append(host, historyContainer, warningsContainer);

    bridge = attachMathEngine({}, engine, host, {
      initialExpression: 'x',
      historyContainer,
      warningsContainer,
    });

    engine.apply('advance');
    const warningItemsAfterFirst = warningsContainer.querySelectorAll('[data-role="math-warning-item"]');
    expect(warningItemsAfterFirst.length).toBe(1);
    expect(warningItemsAfterFirst[0]?.textContent).toContain('b ≠ 0');

    engine.apply('advance');

    const historyEntries = historyContainer.querySelectorAll('[data-role="math-history-entry"]');
    expect(historyEntries.length).toBeGreaterThanOrEqual(2);

    const appliedEntries = historyContainer.querySelectorAll(
      '[data-role="math-history-entry"][data-state="applied"]',
    );
    expect(appliedEntries.length).toBe(2);

    const counter = historyContainer.querySelector('[data-role="math-history-count"]');
    expect(counter?.textContent).toBe('2/2');

    const warningsEmpty = warningsContainer.querySelectorAll('[data-role="math-warning-item"]');
    expect(warningsEmpty.length).toBe(0);
    const warningsPlaceholder = warningsContainer.querySelector('[data-role="math-warnings-empty"]');
    expect(warningsPlaceholder?.textContent).toBe('No domain constraints');

    engine.apply('undo');
    const appliedAfterUndo = historyContainer.querySelectorAll(
      '[data-role="math-history-entry"][data-state="applied"]',
    );
    expect(appliedAfterUndo.length).toBe(1);
    const undoneEntry = historyContainer.querySelector(
      '[data-role="math-history-entry"][data-state="undone"]',
    );
    expect(undoneEntry).not.toBeNull();

    const warningsAfterUndo = warningsContainer.querySelectorAll('[data-role="math-warning-item"]');
    expect(warningsAfterUndo.length).toBe(1);
    expect(warningsAfterUndo[0]?.textContent).toContain('b ≠ 0');

    engine.apply('redo');
    const appliedAfterRedo = historyContainer.querySelectorAll(
      '[data-role="math-history-entry"][data-state="applied"]',
    );
    expect(appliedAfterRedo.length).toBe(2);
    const counterAfterRedo = historyContainer.querySelector('[data-role="math-history-count"]');
    expect(counterAfterRedo?.textContent).toBe('2/2');

    const warningsAfterRedo = warningsContainer.querySelectorAll('[data-role="math-warning-item"]');
    expect(warningsAfterRedo.length).toBe(0);
  });
});
