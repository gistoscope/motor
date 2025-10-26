/** @vitest-environment happy-dom */
/// <reference types="vitest" />
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { queryAnchors } from '../../web/src/dom/anchor-helpers.js';

describe('CC07: queryAnchors dom', () => {
  let originalBody: string;

  beforeEach(() => {
    originalBody = document.body.innerHTML;
  });

  afterEach(() => {
    document.body.innerHTML = originalBody;
  });

  it('finds by #id and data fallbacks', () => {
    document.body.innerHTML = `
      <div class="katex-html">
        <span id="tok:1">2</span>
        <span data-gv-id="tok:2">+</span>
        <span data-token-id="tok:3">3</span>
      </div>`;
    const root = document.querySelector('.katex-html');
    expect(queryAnchors(root!, 'tok:1').length).toBeGreaterThanOrEqual(1);
    expect(queryAnchors(root!, 'tok:2').length).toBeGreaterThanOrEqual(1);
    expect(queryAnchors(root!, 'tok:3').length).toBeGreaterThanOrEqual(1);
  });

  it('ignores ids outside of root', () => {
    document.body.innerHTML = `
      <div class="katex-html">
        <span data-token-id="tok:4">4</span>
      </div>
      <div id="tok:5"></div>`;
    const root = document.querySelector('.katex-html');
    expect(queryAnchors(root!, 'tok:5')).toHaveLength(0);
  });
});
