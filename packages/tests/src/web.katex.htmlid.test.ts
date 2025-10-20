/** @vitest-environment happy-dom */

import { Window } from 'happy-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithKaTeX } from '../../web/src/engine/katex';

declare global {
  interface Window {
    katex?: {
      render: (tex: string, element: HTMLElement, options?: { throwOnError?: boolean }) => void;
    } | undefined;
  }
}

describe('renderWithKaTeX owner detection', () => {
  beforeEach(() => {
    delete (window as Window & { katex?: unknown }).katex;
    document.body.innerHTML = '';
  });

  it('uses the owner document defaultView when rendering', async () => {
    const altWindow = new Window();
    const altDoc = altWindow.document;
    const host = altDoc.createElement('div');
    altDoc.body.append(host);

    const renderSpy = vi.fn((tex: string, element: HTMLElement) => {
      element.textContent = tex;
    });
    altWindow.katex = { render: renderSpy };

    const success = await renderWithKaTeX(host as unknown as HTMLElement, '\\frac{a}{b}', '', undefined);

    expect(success).toBe(true);
    expect(renderSpy).toHaveBeenCalledTimes(1);
    expect(renderSpy).toHaveBeenCalledWith('\\frac{a}{b}', host, { throwOnError: false });
    expect(host.textContent).toBe('\\frac{a}{b}');
  });
});
