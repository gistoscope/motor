/// <reference types="vitest" />
/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { renderWithKaTeX } from '../../web/src/engine/katex';

describe('CC10 — KaTeX anchor injection', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    (window as any).katex = {
      render(tex, element) {
        const doc = element.ownerDocument ?? document;
        element.innerHTML = '';

        const root = doc.createElement('span');
        root.className = 'katex';
        const html = doc.createElement('span');
        html.className = 'katex-html';

        const pattern = /\\htmlId\{([^}]*)\}\{([^}]*)\}/g;
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(tex)) !== null) {
          const span = doc.createElement('span');
          span.id = match[1] ?? '';
          span.textContent = match[2] ?? '';
          html.appendChild(span);
        }

        if (!html.childElementCount) {
          const fallback = doc.createElement('span');
          fallback.textContent = tex;
          html.appendChild(fallback);
        }

        root.appendChild(html);
        element.appendChild(root);
      },
    };
  });

  afterEach(() => {
    delete (window as any).katex;
  });

  it('injects stable ids for basic expressions', async () => {
    const container = document.createElement('div');
    const success = await renderWithKaTeX(container, '2 + 3', '2 + 3');

    expect(success).toBe(true);
    const anchors = container.querySelectorAll('.katex-html [id^="tok:"]');
    expect(anchors.length).toBeGreaterThanOrEqual(3);
  });
});
