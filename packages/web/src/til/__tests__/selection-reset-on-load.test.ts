import React from 'react';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { act, Simulate } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { StepDevRoute } from '../../routes/dev/step';

function renderIntoDocument(element: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(element);
  });
  return { container, root };
}

const runOrSkip = typeof document === 'undefined' ? it.skip : it;

describe('selection reset on load', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_EXPERIMENTAL_M0', 'true');
    if (typeof document !== 'undefined') {
      document.body.innerHTML = '';
    }
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    if (typeof document !== 'undefined') {
      document.body.innerHTML = '';
    }
  });

  runOrSkip('clears existing selection when loading a new working expression', async () => {
    vi.useFakeTimers();
    const { container, root } = renderIntoDocument(React.createElement(StepDevRoute));

    try {
      const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
      const loadButton = container.querySelector('[data-testid="load-working-button"]') as HTMLButtonElement;
      const displayPanel = container.querySelector('[data-testid="display-panel"]') as HTMLDivElement;

      const updateSource = (value: string) => {
        act(() => {
          textarea.value = value;
          Simulate.change(textarea, { target: { value } } as any);
        });
      };

      const clickLoad = async () => {
        await act(async () => {
          loadButton.click();
          await Promise.resolve();
        });
      };

      updateSource('2+3');
      await clickLoad();

      const plusToken = Array.from(displayPanel.querySelectorAll('[data-ast-id]')).find(
        (el) => el.textContent === '+'
      ) as HTMLElement | undefined;
      expect(plusToken).toBeTruthy();

      if (plusToken) {
        act(() => {
          plusToken.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        act(() => {
          vi.advanceTimersByTime(250);
        });
      }

      expect(displayPanel.querySelectorAll('.t-selected').length).toBeGreaterThan(0);
      expect(displayPanel.getAttribute('data-selection-size')).not.toBe('0');

      updateSource('5+6');
      await clickLoad();

      expect(displayPanel.querySelectorAll('.t-selected').length).toBe(0);
      expect(displayPanel.getAttribute('data-selection-size')).toBe('0');
    } finally {
      act(() => {
        root.unmount();
      });
      vi.useRealTimers();
    }
  });
});
