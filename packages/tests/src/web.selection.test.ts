/** @vitest-environment happy-dom */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createPlaygroundDisplay } from '../../web/src/ui/playgroundDisplay';
import { selection } from '../../web/src/ui/selection';

describe('playground display selection', () => {
  let root: HTMLElement;
  let catxContainer: HTMLElement;
  let fallbackContainer: HTMLElement;
  let fallbackHtml: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    root = document.createElement('div');
    catxContainer = document.createElement('div');
    fallbackContainer = document.createElement('div');
    fallbackHtml = document.createElement('div');
    fallbackContainer.appendChild(fallbackHtml);
    root.appendChild(catxContainer);
    root.appendChild(fallbackContainer);
    document.body.appendChild(root);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    delete (window as typeof window & { katex?: unknown }).katex;
    delete (window as typeof window & { __gvClickReady?: boolean }).__gvClickReady;
    selection.current = null;
  });

  const dispatchClick = (target: Element, path: Element[]) => {
    const event = new window.MouseEvent('click', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'composedPath', {
      configurable: true,
      value: () => path,
    });
    target.dispatchEvent(event);
  };

  it('selects the visible leaf and clears on escape', async () => {
    const display = createPlaygroundDisplay({
      root,
      catxContainer,
      fallbackContainer,
      fallbackHtml,
    });

    (window as typeof window & {
      katex?: { render: (tex: string, element: HTMLElement) => void };
    }).katex = {
      render: (_tex, element) => {
        element.innerHTML = `
          <span class="katex">
            <span class="katex-html">
              <span id="tok:first" class="math-token">
                <span class="strut"></span>
                <span class="base">
                  <span class="mord" data-testid="visible-leaf">2</span>
                </span>
              </span>
              <span id="tok:plus" class="math-token">
                <span class="base" data-testid="plus-leaf">+</span>
              </span>
            </span>
          </span>
        `;
      },
    };

    await display.render({ tex: '2+3', plain: '2+3', ast: {} });

    const katexRoot = catxContainer.querySelector<HTMLElement>('.katex-html');
    expect(katexRoot).toBeTruthy();
    const token = katexRoot?.querySelector<HTMLElement>('[id="tok:first"]');
    expect(token).toBeTruthy();
    const leaf = katexRoot?.querySelector<HTMLElement>('[data-testid="visible-leaf"]');
    expect(leaf).toBeTruthy();

    dispatchClick(leaf!, [leaf!, leaf!.parentElement!, token!, katexRoot!]);

    expect(leaf?.classList.contains('math-token--selected')).toBe(true);
    expect((window as typeof window & { __gvClickReady?: boolean }).__gvClickReady).toBe(true);

    const escapeEvent = new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    root.dispatchEvent(escapeEvent);

    expect(leaf?.classList.contains('math-token--selected')).toBe(false);
    expect(selection.current).toBeNull();

    display.destroy();
  });
});
