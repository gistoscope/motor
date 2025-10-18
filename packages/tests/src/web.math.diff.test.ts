import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { Window } from 'happy-dom';

import { attachMathEngine } from '../../web/src/math/bridge';
import type {
  MathBridgeHandle,
  MathEngine,
  MathEngineAction,
  MathEngineEventCallback,
} from '../../web/src/math/types';

interface DiffState {
  readonly html: string;
  readonly ruleId: string | null;
  readonly actions: MathEngineAction[];
}

class DiffOverlayTestEngine implements MathEngine {
  #host: HTMLElement | null = null;
  #listeners: Record<'hover' | 'select' | 'state', Set<MathEngineEventCallback>> = {
    hover: new Set(),
    select: new Set(),
    state: new Set(),
  };
  #index = 0;

  readonly states: DiffState[] = [
    {
      html: [
        '<div data-role="formula">',
        '  <span data-token-id="var">x</span>',
        '</div>',
        '<div data-role="graph">',
        '  <div data-node-id="A" class="motor-node"><span>A</span></div>',
        '  <div data-node-id="B" class="motor-node"><span>B</span></div>',
        '  <div data-from="A" data-to="B" class="motor-edge">A→B</div>',
        '</div>',
      ].join(''),
      ruleId: null,
      actions: [
        { id: 'A1', label: 'Apply A1', kind: 'transform' },
      ],
    },
    {
      html: [
        '<div data-role="formula">',
        '  <span data-token-id="var">x</span>',
        '  <span data-token-id="plus">+</span>',
        '  <span data-token-id="one">1</span>',
        '</div>',
        '<div data-role="graph">',
        '  <div data-node-id="A" class="motor-node"><span>A</span></div>',
        '  <div data-node-id="C" class="motor-node"><span>C</span></div>',
        '  <div data-node-id="B" class="motor-node"><span>B</span></div>',
        '  <div data-from="A" data-to="C" class="motor-edge">A→C</div>',
        '  <div data-from="C" data-to="B" class="motor-edge">C→B</div>',
        '  <div data-from="A" data-to="B" class="motor-edge">A→B</div>',
        '</div>',
      ].join(''),
      ruleId: 'rule:A1',
      actions: [
        { id: 'B4', label: 'Apply B4', kind: 'transform' },
        { id: 'undo', label: 'Undo', kind: 'history' },
      ],
    },
    {
      html: [
        '<div data-role="formula">',
        '  <span data-token-id="var">y</span>',
        '  <span data-token-id="plus">+</span>',
        '  <span data-token-id="one">1</span>',
        '</div>',
        '<div data-role="graph">',
        '  <div data-node-id="A" class="motor-node"><span>A</span></div>',
        '  <div data-node-id="C" class="motor-node"><span>C*</span></div>',
        '  <div data-node-id="B" class="motor-node"><span>B</span></div>',
        '  <div data-from="A" data-to="C" class="motor-edge">A→C*</div>',
        '  <div data-from="C" data-to="B" class="motor-edge">C→B</div>',
        '  <div data-from="A" data-to="B" class="motor-edge">A→B</div>',
        '</div>',
      ].join(''),
      ruleId: 'rule:B4',
      actions: [
        { id: 'C6', label: 'Apply C6', kind: 'transform' },
        { id: 'undo', label: 'Undo', kind: 'history' },
      ],
    },
    {
      html: [
        '<div data-role="formula">',
        '  <span data-token-id="var">y</span>',
        '</div>',
        '<div data-role="graph">',
        '  <div data-node-id="A" class="motor-node"><span>A</span></div>',
        '</div>',
      ].join(''),
      ruleId: 'rule:C6',
      actions: [
        { id: 'undo', label: 'Undo', kind: 'history' },
      ],
    },
  ];

  mount(host: HTMLElement): void {
    this.#host = host;
    this.#render();
    this.#emit('state', { ruleId: this.states[this.#index]?.ruleId ?? null, legalActions: this.getLegalActions() });
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
    return this.states[this.#index]?.actions ?? [];
  }

  apply(actionId: string): void {
    if (actionId === 'undo') {
      if (this.#index > 0) {
        this.#index -= 1;
        this.#render();
        this.#emit('state', { ruleId: 'undo', legalActions: this.getLegalActions() });
      }
      return;
    }

    if (actionId === 'A1') {
      this.#index = 1;
    } else if (actionId === 'B4') {
      this.#index = 2;
    } else if (actionId === 'C6') {
      this.#index = 3;
    }
    this.#render();
    this.#emit('state', { ruleId: actionId, legalActions: this.getLegalActions() });
  }

  export(): { ast: unknown; html?: string | undefined; tex?: string | undefined } {
    return {
      ast: null,
      html: this.#host?.innerHTML,
    };
  }

  #render(): void {
    if (!this.#host) {
      return;
    }
    this.#host.innerHTML = this.states[this.#index]?.html ?? '';
  }

  #emit(event: 'hover' | 'select' | 'state', payload: unknown): void {
    for (const cb of this.#listeners[event]) {
      cb(payload);
    }
  }
}

const expectDiffClass = (element: Element | null, className: string) => {
  expect(element, `Expected element for ${className}`).not.toBeNull();
  expect(element?.classList.contains(className)).toBe(true);
};

describe('math diff overlay integration', () => {
  let domWindow: Window;
  let bridge: MathBridgeHandle | null = null;
  let engine: DiffOverlayTestEngine;

  beforeEach(() => {
    domWindow = new Window();
    globalThis.window = domWindow as unknown as typeof globalThis.window;
    globalThis.document = domWindow.document as unknown as typeof globalThis.document;
    globalThis.navigator = domWindow.navigator as unknown as typeof globalThis.navigator;
    engine = new DiffOverlayTestEngine();
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

  it('highlights math diffs for A1/B4/C6 actions deterministically', () => {
    const host = document.createElement('div');
    host.dataset.role = 'math-host';
    document.body.append(host);

    bridge = attachMathEngine({}, engine, host, { initialExpression: 'x' });

    engine.apply('A1');
    const plusToken = host.querySelector('[data-token-id="plus"]');
    const oneToken = host.querySelector('[data-token-id="one"]');
    const nodeC = host.querySelector('[data-node-id="C"]');
    const edgeAC = host.querySelector('[data-from="A"][data-to="C"]');

    expectDiffClass(plusToken, 'motor-diff-add');
    expectDiffClass(oneToken, 'motor-diff-add');
    expectDiffClass(nodeC, 'motor-diff-add');
    expectDiffClass(edgeAC, 'motor-diff-add');
    expect(host.classList.contains('motor-diff-del')).toBe(false);

    engine.apply('B4');
    const varToken = host.querySelector('[data-token-id="var"]');
    const updatedNodeC = host.querySelector('[data-node-id="C"]');
    const updatedEdgeAC = host.querySelector('[data-from="A"][data-to="C"]');

    expect(varToken?.textContent).toBe('y');
    expectDiffClass(varToken, 'motor-diff-chg');
    expectDiffClass(updatedNodeC, 'motor-diff-chg');
    expectDiffClass(updatedEdgeAC, 'motor-diff-chg');
    expect(plusToken?.classList.contains('motor-diff-add')).toBe(false);
    expect(host.classList.contains('motor-diff-del')).toBe(false);

    engine.apply('C6');
    const remainingVar = host.querySelector('[data-token-id="var"]');
    expect(remainingVar?.classList.contains('motor-diff-add')).toBe(false);
    expect(remainingVar?.classList.contains('motor-diff-chg')).toBe(false);
    expect(host.classList.contains('motor-diff-del')).toBe(true);

    engine.apply('undo');
    const restoredPlus = host.querySelector('[data-token-id="plus"]');
    const restoredOne = host.querySelector('[data-token-id="one"]');
    expectDiffClass(restoredPlus, 'motor-diff-add');
    expectDiffClass(restoredOne, 'motor-diff-add');
    expect(host.classList.contains('motor-diff-del')).toBe(false);
  });
});
