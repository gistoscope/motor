/// <reference types="vitest" />
import { describe, it, expect } from 'vitest';
import { anchorSelectors } from '../../web/src/dom/anchor-helpers.js';

describe('CC07: anchorSelectors', () => {
  it('priority: #id then [data-gv-id] then [data-token-id]', () => {
    const selectors = anchorSelectors('tok:7');
    expect(selectors[0]).toBe('#tok:7');
    expect(selectors[1]).toBe('[data-gv-id="tok:7"]');
    expect(selectors[2]).toBe('[data-token-id="tok:7"]');
  });
});
