/// <reference types="vitest" />
/** @vitest-environment happy-dom */
import { describe, it, expect } from 'vitest';

import withHtmlIdsFromEngine from '../../web/src/engine/latexIds.engine';
import katex from '../../web/vendor/katex/katex.mjs';

function renderToDiv(latex: string) {
  const div = global.document.createElement('div');
  global.document.body.appendChild(div);
  katex.render(latex, div, {
    throwOnError: false,
    trust: (ctx: any) => ctx?.command === '\\htmlId' || ctx?.command === '\\htmlClass',
  });
  return div;
}

describe('CC06A: KaTeX htmlId anchors', () => {
  it('wraps simple "2+3" → ≥3 ids', () => {
    const src = '2+3';
    const withIds = withHtmlIdsFromEngine(src);
    const el = renderToDiv(withIds);
    const ids = el.querySelectorAll('[id]');
    expect(ids.length).toBeGreaterThanOrEqual(3);
  });

  it('works with TeX commands (\\left ... \\right, \\frac)', () => {
    const src = '\\left(2+3\\right)\\,/\\frac{5}{x}';
    const withIds = withHtmlIdsFromEngine(src);
    const el = renderToDiv(withIds);
    const ids = el.querySelectorAll('[id]');
    expect(ids.length).toBeGreaterThanOrEqual(5);
  });
});
