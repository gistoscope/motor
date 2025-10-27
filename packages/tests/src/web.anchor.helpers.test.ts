/** @vitest-environment happy-dom */
/// <reference types="vitest" />
import { describe, it, expect } from 'vitest';
import { anchorSelectors, queryAnchors } from '../../web/src/dom/anchor-helpers.js';

describe('CC07: anchor helpers', () => {
  it('priority order is stable', () => {
    const s = anchorSelectors('tok:7');
    expect(s[0]).toBe('#tok:7');
    expect(s[1]).toBe('[data-gv-id="tok:7"]');
    expect(s[2]).toBe('[data-token-id="tok:7"]');
  });

  it('query by any supported anchor', () => {
    document.body.innerHTML = `
      <div class="katex-html">
        <span id="tok:1">2</span>
        <span data-gv-id="tok:2">+</span>
        <span data-token-id="tok:3">3</span>
      </div>`;
    const root = document.querySelector('.katex-html');
    expect(queryAnchors(root, 'tok:1').length).toBeGreaterThanOrEqual(1);
    expect(queryAnchors(root, 'tok:2').length).toBeGreaterThanOrEqual(1);
    expect(queryAnchors(root, 'tok:3').length).toBeGreaterThanOrEqual(1);
  });
});
