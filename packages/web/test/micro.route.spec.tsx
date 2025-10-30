import React, { act } from 'react';
import { describe, expect, it, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';

import MicroViewerRoute from '../src/routes/micro/MicroViewerRoute';

describe('MicroViewerRoute', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders KaTeX content for the active sample', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<MicroViewerRoute />);
    });

    const katexNodes = container.querySelectorAll('[data-testid="micro-viewer-katex"] .katex');
    expect(katexNodes.length).toBeGreaterThan(0);

    root.unmount();
  });

  it('activates bracket pairs on hover', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<MicroViewerRoute />);
    });

    const bracket = container.querySelector('[data-bracket-pair]') as HTMLElement | null;
    expect(bracket).not.toBeNull();

    if (bracket) {
      await act(async () => {
        bracket.dispatchEvent(new window.Event('mouseenter', { bubbles: true }));
      });

      const active = container.querySelectorAll('[data-bracket-active="true"]');
      expect(active.length).toBeGreaterThanOrEqual(2);
    }

    root.unmount();
  });
});
