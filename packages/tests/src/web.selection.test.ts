/** @vitest-environment happy-dom */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createPlaygroundDisplay } from '../../web/src/ui/playgroundDisplay';
import * as selectionModule from '../../web/src/ui/selection';

function dispatchClick(target: Element, path: Element[]): void {
  const event = new window.MouseEvent('click', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'composedPath', {
    configurable: true,
    value: () => path,
  });
  target.dispatchEvent(event);
}

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
    selectionModule.clear(document);
  });

  it('selects the visible leaf, clears on escape, and avoids duplicate listeners on re-render', async () => {
    const display = createPlaygroundDisplay({
      root,
      catxContainer,
      fallbackContainer,
      fallbackHtml,
    });

    let renderCount = 0;
    (window as typeof window & {
      katex?: { render: (tex: string, element: HTMLElement) => void };
    }).katex = {
      render: (_tex, element) => {
        renderCount += 1;
        element.innerHTML = `
          <span class="katex">
            <span class="katex-html" data-render-count="${renderCount}">
              <span id="tok:first" class="math-token">
                <span class="strut"></span>
                <span class="base">
                  <span class="mord" data-testid="visible-leaf">${renderCount}</span>
                </span>
              </span>
              <span id="tok:second" class="math-token">
                <span class="base" data-testid="second-leaf">+</span>
              </span>
            </span>
          </span>
        `;
      },
    };

    await display.render({ tex: '2+3', plain: '2+3', ast: {} });

    const katexRoot = catxContainer.querySelector<HTMLElement>('.katex-html');
    expect(katexRoot).toBeTruthy();
    const token = katexRoot?.querySelector<HTMLElement>('#tok\\:first');
    expect(token).toBeTruthy();
    const leaf = katexRoot?.querySelector<HTMLElement>('[data-testid="visible-leaf"]');
    expect(leaf).toBeTruthy();

    const selectSpy = vi.spyOn(selectionModule, 'select');

    dispatchClick(token!, [token!, katexRoot!]);

    expect(leaf?.classList.contains('math-token--selected')).toBe(true);
    expect(selectionModule.getCurrent()).toBe('tok:first');
    expect((window as typeof window & { __gvClickReady?: boolean }).__gvClickReady).toBe(true);
    expect(selectSpy).toHaveBeenCalledTimes(1);

    const escapeEvent = new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    document.dispatchEvent(escapeEvent);

    expect(leaf?.classList.contains('math-token--selected')).toBe(false);
    expect(selectionModule.getCurrent()).toBeNull();

    selectSpy.mockClear();

    await display.render({ tex: '2+3', plain: '2+3', ast: {} });

    const nextRoot = catxContainer.querySelector<HTMLElement>('.katex-html');
    expect(nextRoot).toBeTruthy();
    const secondToken = nextRoot?.querySelector<HTMLElement>('#tok\\:second');
    expect(secondToken).toBeTruthy();
    const secondLeaf = nextRoot?.querySelector<HTMLElement>('[data-testid="second-leaf"]');
    expect(secondLeaf).toBeTruthy();

    dispatchClick(secondToken!, [secondToken!, nextRoot!]);

    expect(nextRoot?.querySelectorAll('.math-token--selected')).toHaveLength(1);
    expect(secondLeaf?.classList.contains('math-token--selected')).toBe(true);
    expect(selectionModule.getCurrent()).toBe('tok:second');
    expect(selectSpy).toHaveBeenCalledTimes(1);

    selectSpy.mockRestore();
    display.destroy();
  });
});
