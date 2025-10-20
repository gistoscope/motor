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
});
