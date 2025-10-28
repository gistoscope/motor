/** @vitest-environment happy-dom */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createPlaygroundDisplay } from '../../web/src/ui/playgroundDisplay';
import { getSelection, clearSelection } from '../../web/src/ui/selection';

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
    clearSelection(document);
    document.body.innerHTML = '';
    delete (window as typeof window & { katex?: unknown }).katex;
    delete (window as typeof window & { __gvClickReady?: boolean }).__gvClickReady;
  });

  const dispatchClick = (target: Element, path: Element[]) => {
    const event = new window.MouseEvent('click', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'composedPath', {
      configurable: true,
      value: () => path,
    });
    target.dispatchEvent(event);
  };

  const selectedCount = (context: ParentNode): number =>
    context.querySelectorAll('.math-token--selected').length;

  it('highlights a single visible leaf and clears on escape', async () => {
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
                  <span class="mord" data-testid="leaf-2">2</span>
                </span>
              </span>
              <span id="tok:plus" class="math-token">
                <span class="base">
                  <span class="mord" data-testid="leaf-plus">+</span>
                </span>
              </span>
              <span id="tok:second" class="math-token">
                <span class="base">
                  <span class="mord" data-testid="leaf-3">3</span>
                </span>
              </span>
            </span>
          </span>
        `;
      },
    };

    await display.render({ tex: '(2+3)', plain: '(2+3)', ast: {} });

    const katexRoot = catxContainer.querySelector<HTMLElement>('.katex-html');
    expect(katexRoot).toBeTruthy();

    const firstToken = katexRoot?.querySelector<HTMLElement>('[id="tok:first"]');
    const firstLeaf = katexRoot?.querySelector<HTMLElement>('[data-testid="leaf-2"]');
    const plusToken = katexRoot?.querySelector<HTMLElement>('[id="tok:plus"]');
    const plusLeaf = katexRoot?.querySelector<HTMLElement>('[data-testid="leaf-plus"]');
    expect(firstToken).toBeTruthy();
    expect(firstLeaf).toBeTruthy();
    expect(plusToken).toBeTruthy();
    expect(plusLeaf).toBeTruthy();

    dispatchClick(firstLeaf!, [firstLeaf!, firstLeaf!.parentElement!, firstToken!, katexRoot!]);

    expect(selectedCount(katexRoot!)).toBe(1);
    expect(firstLeaf?.classList.contains('math-token--selected')).toBe(true);
    expect(getSelection()).toEqual({ id: firstLeaf!.id || 'tok:first' });
    expect((window as typeof window & { __gvClickReady?: boolean }).__gvClickReady).toBe(true);

    const escapeEvent = new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    document.dispatchEvent(escapeEvent);

    expect(selectedCount(katexRoot!)).toBe(0);
    expect(getSelection()).toBeNull();

    dispatchClick(plusLeaf!, [plusLeaf!, plusLeaf!.parentElement!, plusToken!, katexRoot!]);

    expect(selectedCount(katexRoot!)).toBe(1);
    const selectedNode = katexRoot!.querySelector<HTMLElement>('.math-token--selected');
    expect(selectedNode?.textContent?.trim()).toBe('+');
    expect((window as typeof window & { __gvClickReady?: boolean }).__gvClickReady).toBe(true);

    display.destroy();
  });
});
