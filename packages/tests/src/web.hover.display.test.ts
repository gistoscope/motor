/** @vitest-environment happy-dom */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createPlaygroundDisplay } from '../../web/src/ui/playgroundDisplay';

interface TokenSpec {
  id: string;
  text: string;
}

const renderMarkup = (tokens: TokenSpec[]) => `
  <span class="katex">
    <span class="katex-html">
      ${tokens
        .map(
          ({ id, text }) =>
            `<span id="${id}" class="math-token"><span class="base">${text}</span></span>`,
        )
        .join('')}
    </span>
  </span>
`;

describe('playground display hover painter', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
    delete (window as typeof window & { katex?: unknown }).katex;
    delete (window as typeof window & { __hoverPainterReady?: boolean }).__hoverPainterReady;
  });

  const dispatchHover = (target: Element, root: Element) => {
    const event = new window.MouseEvent('mouseover', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'composedPath', {
      configurable: true,
      value: () => [target, root],
    });
    target.dispatchEvent(event);
  };

  it('highlights tokens after render and re-render', async () => {
    const root = document.createElement('div');
    const catxContainer = document.createElement('div');
    const fallbackContainer = document.createElement('div');
    const fallbackHtml = document.createElement('div');
    fallbackContainer.appendChild(fallbackHtml);
    root.appendChild(catxContainer);
    root.appendChild(fallbackContainer);
    document.body.appendChild(root);

    const display = createPlaygroundDisplay({
      root,
      catxContainer,
      fallbackContainer,
      fallbackHtml,
    });

    (window as typeof window & { katex?: { render: (tex: string, element: HTMLElement) => void } }).katex = {
      render: (_tex, element) => {
        element.innerHTML = renderMarkup([
          { id: 'tok:first', text: '2' },
          { id: 'tok:plus', text: '+' },
          { id: 'tok:second', text: '3' },
        ]);
      },
    };

    await display.render({ tex: '2+3', plain: '2+3', ast: {} });

    const firstRoot = catxContainer.querySelector<HTMLElement>('.katex-html');
    expect(firstRoot).toBeTruthy();
    const firstToken = catxContainer.querySelector<HTMLElement>('[id="tok:first"]');
    expect(firstToken).toBeTruthy();

    dispatchHover(firstToken!, firstRoot!);
    expect(firstToken?.classList.contains('math-token--hovered')).toBe(true);
    expect((window as typeof window & { __hoverPainterReady?: boolean }).__hoverPainterReady).toBe(true);

    (window as typeof window & { katex?: { render: (tex: string, element: HTMLElement) => void } }).katex = {
      render: (_tex, element) => {
        element.innerHTML = renderMarkup([
          { id: 'tok:alpha', text: 'a' },
          { id: 'tok:plus', text: '+' },
          { id: 'tok:beta', text: 'b' },
        ]);
      },
    };

    const rerenderPromise = display.render({ tex: 'a+b', plain: 'a+b', ast: {} });
    expect((window as typeof window & { __hoverPainterReady?: boolean }).__hoverPainterReady).toBe(false);
    await rerenderPromise;

    const secondRoot = catxContainer.querySelector<HTMLElement>('.katex-html');
    expect(secondRoot).toBeTruthy();
    const secondToken = catxContainer.querySelector<HTMLElement>('[id="tok:alpha"]');
    expect(secondToken).toBeTruthy();

    dispatchHover(secondToken!, secondRoot!);
    expect(secondToken?.classList.contains('math-token--hovered')).toBe(true);
    expect((window as typeof window & { __hoverPainterReady?: boolean }).__hoverPainterReady).toBe(true);

    display.destroy();
    expect((window as typeof window & { __hoverPainterReady?: boolean }).__hoverPainterReady).toBe(false);
  });
});
