import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { Window } from 'happy-dom';

import { renderWithKaTeX } from '../src/engine/katex';
import { TOKEN_ID_PREFIX } from '../src/util/tokenAnchors';

describe('KaTeX anchors', () => {
  let domWindow: Window;

  beforeEach(() => {
    domWindow = new Window();
    globalThis.window = domWindow as unknown as typeof globalThis.window;
    globalThis.document = domWindow.document as unknown as typeof globalThis.document;
    globalThis.navigator = domWindow.navigator as unknown as typeof globalThis.navigator;
    (globalThis as any).HTMLElement = domWindow.HTMLElement;
    (globalThis as any).MutationObserver = domWindow.MutationObserver;
    (globalThis as any).CustomEvent = domWindow.CustomEvent;
    (globalThis as any).Event = domWindow.Event;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    delete (globalThis as any).Event;
    delete (globalThis as any).CustomEvent;
    delete (globalThis as any).MutationObserver;
    delete (globalThis as any).HTMLElement;
    delete (globalThis as any).navigator;
    delete (globalThis as any).document;
    delete (globalThis as any).window;
  });

  it('applies token anchors after rendering', async () => {
    const container = document.createElement('div');
    const ownerDocument = container.ownerDocument ?? document;

    (domWindow as unknown as { katex: { render: (tex: string, element: HTMLElement) => void } }).katex = {
      render(tex, element) {
        const doc = element.ownerDocument ?? ownerDocument;
        element.innerHTML = '';
        const katexRoot = doc.createElement('span');
        katexRoot.className = 'katex';
        const row = doc.createElement('span');
        row.className = 'katex-html';

        const pattern = /\\htmlClass\{[^}]*\}\{\\htmlId\{([^}]*)\}\{([^}]*)\}\}/g;
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(tex)) !== null) {
          const span = doc.createElement('span');
          span.className = 'mord';
          span.id = match[1] ?? '';
          span.textContent = match[2] ?? '';
          row.appendChild(span);
        }

        if (!row.childElementCount) {
          const fallback = doc.createElement('span');
          fallback.className = 'mord';
          fallback.textContent = tex;
          row.appendChild(fallback);
        }

        katexRoot.appendChild(row);
        element.appendChild(katexRoot);
      },
    };

    const success = await renderWithKaTeX(container, '2+3', '2+3');
    expect(success).toBe(true);

    const tokens = container.querySelectorAll(`[id^="${TOKEN_ID_PREFIX}"]`);
    expect(tokens.length).toBeGreaterThanOrEqual(3);
  });
});
