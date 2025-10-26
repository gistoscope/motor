/** @vitest-environment happy-dom */
export {};

import { describe, expect, it } from 'vitest';

import { renderWithKaTeX } from '../../web/src/engine/katex';

declare global {
  interface Window {
    katex?: any;
  }
}

describe('renderWithKaTeX', () => {
  it('preserves ids produced by KaTeX', async () => {
    const g = globalThis as any;
    const originalKatex = g.katex;
    g.katex = {
      render: (_latex: string, el: HTMLElement) => {
        el.innerHTML = `<span id="node-1">x</span>`;
      },
    };

    try {
      const div = document.createElement('div');
      await renderWithKaTeX(div, '\\htmlId{node-1}{x}', '\\htmlId{node-1}{x}');
      expect(div.querySelector('#node-1')).not.toBeNull();
    } finally {
      if (typeof originalKatex === 'undefined') {
        delete g.katex;
      } else {
        g.katex = originalKatex;
      }
    }
  });

  it('injects trusted htmlId anchors for tokens', async () => {
    const g = globalThis as any;
    const originalKatex = g.katex;
    let lastLatex: string | null = null;
    let lastOptions: any = null;
    g.katex = {
      render: (latex: string, el: HTMLElement, options: any) => {
        lastLatex = latex;
        lastOptions = options;
        const matches = Array.from(
          latex.matchAll(/\\htmlClass\{[^}]*\}\{\\htmlId\{([^}]*)\}\{([^}]*)\}\}/g),
        );
        el.innerHTML = matches
          .map(([, id, body]) => `<span id="${id}">${body}</span>`)
          .join('');
      },
    };

    try {
      const renderLatex = async (latex: string) => {
        const div = document.createElement('div');
        await renderWithKaTeX(div, latex, latex);
        return div.querySelectorAll('[id^="gv:V1:"]');
      };

      const plusTokens = await renderLatex('2+3');
      expect(plusTokens.length).toBeGreaterThanOrEqual(3);

      const parenTokens = await renderLatex('\\left(2+3\\right)');
      expect(parenTokens.length).toBeGreaterThanOrEqual(3);

      expect(lastLatex).toBeTypeOf('string');
      expect(lastLatex).toContain('\\htmlId{gv:V1:');
      expect(typeof lastOptions?.trust).toBe('function');
      expect(lastOptions?.trust?.({ command: '\\htmlId' })).toBe(true);
      expect(lastOptions?.trust?.({ command: '\\htmlClass' })).toBe(true);
      expect(lastOptions?.trust?.({ command: '\\href' })).toBe(false);
    } finally {
      if (typeof originalKatex === 'undefined') {
        delete g.katex;
      } else {
        g.katex = originalKatex;
      }
    }
  });
});
