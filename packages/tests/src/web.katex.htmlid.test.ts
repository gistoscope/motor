import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { Window } from 'happy-dom';

import { createPlaygroundDisplay } from '../../web/src/ui/playgroundDisplay';

declare global {
  // eslint-disable-next-line no-var
  var window: Window;
}

describe('KaTeX htmlId integration', () => {
  let domWindow: Window;

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
    let rafId = 0;
    const rafHandles = new Map<number, ReturnType<typeof domWindow.setTimeout>>();
    (globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
      rafId += 1;
      const id = rafId;
      const handle = domWindow.setTimeout(() => {
        rafHandles.delete(id);
        cb(domWindow.performance.now());
      }, 0);
      rafHandles.set(id, handle);
      return id;
    };
    (globalThis as any).cancelAnimationFrame = (handle: number) => {
      const timeout = rafHandles.get(handle);
      if (timeout) {
        domWindow.clearTimeout(timeout);
        rafHandles.delete(handle);
      }
    };

    (domWindow as unknown as { katex?: unknown }).katex = {
      render(tex: string, element: HTMLElement) {
        const ownerDocument = element.ownerDocument ?? document;
        element.innerHTML = '';
        const fragment = ownerDocument.createDocumentFragment();
        const pattern = /\\html(Id|Class)\{([^}]*)\}\{([^}]*)\}/g;
        let index = 0;
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(tex)) !== null) {
          const [full, kind, identifier, body] = match;
          const prefix = tex.slice(index, match.index);
          if (prefix) {
            fragment.appendChild(ownerDocument.createTextNode(prefix));
          }
          const span = ownerDocument.createElement('span');
          if (kind === 'Id') {
            span.id = identifier;
          } else {
            span.className = identifier;
          }
          span.textContent = body;
          fragment.appendChild(span);
          index = match.index + full.length;
        }
        const remainder = tex.slice(index);
        if (remainder) {
          fragment.appendChild(ownerDocument.createTextNode(remainder));
        }
        element.appendChild(fragment);
      },
    };
  });

  afterEach(() => {
    document.body.innerHTML = '';
    delete (domWindow as any).katex;
    delete (globalThis as any).cancelAnimationFrame;
    delete (globalThis as any).requestAnimationFrame;
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

  it('wraps AST tokens with htmlId spans for KaTeX output', async () => {
    const root = document.createElement('div');
    const catxContainer = document.createElement('div');
    catxContainer.dataset.role = 'math-display-catx';
    const fallbackContainer = document.createElement('div');
    const fallbackHtml = document.createElement('div');
    fallbackContainer.appendChild(fallbackHtml);
    root.appendChild(catxContainer);
    root.appendChild(fallbackContainer);

    const handle = createPlaygroundDisplay({
      root,
      catxContainer,
      fallbackContainer,
      fallbackHtml,
    });

    const ast = {
      linear: ['left', 'op', 'right'],
      tokens: {
        left: { latex: 'x' },
        op: { latex: '+' },
        right: { latex: '1' },
      },
    };

    await handle.render({ ast });

    const nodes = Array.from(catxContainer.querySelectorAll('[id^="node-"]'));
    expect(nodes.length).toBeGreaterThan(0);
    expect(nodes.map((el) => el.id)).toEqual(
      expect.arrayContaining(['node-left', 'node-op', 'node-right']),
    );

    handle.destroy();
  });
});
