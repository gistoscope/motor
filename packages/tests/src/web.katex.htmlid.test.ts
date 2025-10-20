import { Window as HappyDomWindow } from 'happy-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { renderWithKaTeX } from '../../web/src/engine/katex';

declare global {
  interface Window {
    katex?: {
      render: (
        tex: string,
        element: HTMLElement,
        options?: {
          trust?: unknown;
          strict?: unknown;
        },
      ) => void;
    };
  }
}

describe('KaTeX HTML macros', () => {
  let domWindow: HappyDomWindow;

  beforeEach(() => {
    domWindow = new HappyDomWindow();
    globalThis.window = domWindow as unknown as typeof globalThis.window;
    globalThis.document = domWindow.document as unknown as typeof globalThis.document;
  });

  afterEach(() => {
    delete window.katex;
    document.body.innerHTML = '';
    delete (globalThis as { window?: typeof globalThis.window }).window;
    delete (globalThis as { document?: typeof globalThis.document }).document;
  });

  it('allows rendering of \\htmlId and \\htmlClass via KaTeX trust callback', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    let receivedTrust: unknown;
    let receivedStrict: unknown;

    window.katex = {
      render: (_tex, element, options) => {
        receivedTrust = options?.trust;
        receivedStrict = options?.strict;
        if (element) {
          element.textContent = 'rendered';
        }
      },
    };

    const success = await renderWithKaTeX(target, '\\htmlId{foo}{bar}', '');

    expect(success).toBe(true);
    expect(target.textContent).toBe('rendered');
    expect(typeof receivedTrust).toBe('function');

    const trustFn = receivedTrust as (context: { command?: string }) => boolean;
    expect(trustFn({ command: '\\htmlId' })).toBe(true);
    expect(trustFn({ command: '\\htmlClass' })).toBe(true);
    expect(trustFn({ command: '\\href' })).toBe(false);
    expect(receivedStrict).toBe('ignore');
  });
});
