import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { Window } from 'happy-dom';

import { astToGraph } from '../../web/src/math/ast2graph';
import { createViewer, initMath } from '../../web/src/viewer';
import type {
  MathEngine,
  MathEngineAction,
  MathEngineEventCallback,
  MathEngineEventName,
} from '../../web/src/math/types';

describe('math AST graph integration', () => {
  let domWindow: Window;
  let originalWindow: typeof globalThis.window | undefined;
  let originalDocument: typeof globalThis.document | undefined;
  let originalNavigator: typeof globalThis.navigator | undefined;
  let handle: ReturnType<typeof createViewer> | null = null;

  beforeEach(() => {
    domWindow = new Window();
    originalWindow = globalThis.window;
    originalDocument = globalThis.document;
    originalNavigator = globalThis.navigator;
    globalThis.window = domWindow as unknown as typeof globalThis.window;
    globalThis.document = domWindow.document as unknown as typeof globalThis.document;
    globalThis.navigator = domWindow.navigator as unknown as typeof globalThis.navigator;
    initMath(null);
  });

  afterEach(() => {
    if (handle) {
      handle.destroy();
      handle = null;
    }
    if (typeof document !== 'undefined') {
      document.body.innerHTML = '';
    }
    initMath(null);
    vi.restoreAllMocks();
    if (originalWindow !== undefined) {
      globalThis.window = originalWindow;
    } else {
      delete (globalThis as any).window;
    }
    if (originalDocument !== undefined) {
      globalThis.document = originalDocument;
    } else {
      delete (globalThis as any).document;
    }
    if (originalNavigator !== undefined) {
      globalThis.navigator = originalNavigator;
    } else {
      delete (globalThis as any).navigator;
    }
  });

  it('converts AST to deterministic GraphJSON', () => {
    const ast = {
      tokens: {
        'root.left': { text: '1' },
        'root.op': { text: '+' },
        'root.right': { text: '2' },
      },
      nodes: {
        root: { type: 'Operation' },
      },
      parent: {
        'root.left': 'root',
        'root.op': 'root',
        'root.right': 'root',
      },
    };

    const graph = astToGraph(ast);
    expect(graph).toEqual({
      nodes: [
        { id: 'root', label: 'Operation' },
        { id: 'root.left', label: '1' },
        { id: 'root.op', label: '+' },
        { id: 'root.right', label: '2' },
      ],
      edges: [
        { from: 'root', to: 'root.left' },
        { from: 'root', to: 'root.op' },
        { from: 'root', to: 'root.right' },
      ],
    });

    const again = astToGraph(ast);
    expect(again).toEqual(graph);
  });

  it('synchronizes hover between math tokens and AST graph', async () => {
    const ast = {
      tokens: {
        'root.left': { text: '1' },
        'root.op': { text: '+' },
        'root.right': { text: '2' },
      },
      nodes: {
        root: { type: 'Operation' },
      },
      parent: {
        'root.left': 'root',
        'root.op': 'root',
        'root.right': 'root',
      },
    };

    class MockAstEngine implements MathEngine {
      #listeners: Record<MathEngineEventName, Set<MathEngineEventCallback>> = {
        hover: new Set(),
        select: new Set(),
        state: new Set(),
      };
      #host: HTMLElement | null = null;

      mount(host: HTMLElement): void {
        this.#host = host;
        host.innerHTML = '';
        const doc = host.ownerDocument ?? document;
        const left = doc.createElement('span');
        left.dataset.tokenId = 'root.left';
        left.textContent = '1';
        const op = doc.createElement('span');
        op.dataset.tokenId = 'root.op';
        op.textContent = '+';
        const right = doc.createElement('span');
        right.dataset.tokenId = 'root.right';
        right.textContent = '2';
        host.append(left, op, right);
        this.#emit('state', { ast });
      }

      on(event: MathEngineEventName, cb: MathEngineEventCallback): () => void {
        this.#listeners[event].add(cb);
        return () => {
          this.#listeners[event].delete(cb);
        };
      }

      getLegalActions(): MathEngineAction[] {
        return [];
      }

      apply(): void {}

      export(): { ast: unknown; html?: string | undefined; tex?: string | undefined } {
        return { ast, html: this.#host?.innerHTML };
      }

      emitHover(id: string): void {
        this.#emit('hover', id);
      }

      #emit(event: MathEngineEventName, payload: unknown): void {
        for (const cb of this.#listeners[event]) {
          cb(payload);
        }
      }
    }

    const root = document.createElement('div');
    document.body.appendChild(root);

    handle = createViewer(root);

    let currentEngine: MockAstEngine | null = null;
    initMath(() => {
      currentEngine = new MockAstEngine();
      return currentEngine;
    });

    await vi.waitFor(() => {
      const panel = root.querySelector('[data-role="math-panel"]');
      expect(panel?.dataset.state).toBe('ready');
    });

    const graphView = root.querySelector('[data-role="math-graph-view"]');
    expect(graphView).toBeTruthy();

    currentEngine?.emitHover('root.op');

    await vi.waitFor(() => {
      const node = root.querySelector(
        '[data-role="math-graph-view"] .motor-node[data-node-id="root.op"]',
      );
      expect(node?.classList.contains('motor-node--hover')).toBe(true);
    });

    const graphNode = root.querySelector(
      '[data-role="math-graph-view"] .motor-node[data-node-id="root.right"]',
    );
    expect(graphNode).toBeTruthy();

    graphNode!.dispatchEvent(
      new window.CustomEvent('motor:node-hover', {
        detail: { nodeId: 'root.right' },
        bubbles: true,
      }),
    );

    await vi.waitFor(() => {
      const token = root.querySelector('[data-token-id="root.right"]');
      expect(token?.classList.contains('math-token--hovered')).toBe(true);
    });

    graphNode!.dispatchEvent(
      new window.CustomEvent('motor:node-leave', {
        detail: { nodeId: 'root.right' },
        bubbles: true,
      }),
    );

    await vi.waitFor(() => {
      const token = root.querySelector('[data-token-id="root.right"]');
      expect(token?.classList.contains('math-token--hovered')).toBe(false);
    });
  });
});
