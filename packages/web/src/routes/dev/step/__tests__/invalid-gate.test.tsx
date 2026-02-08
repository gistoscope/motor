import React from 'react';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { act, Simulate } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { StepDevRoute } from '..';
import * as tsaAdapter from '../../../../til/tsaAdapter';

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

describe('StepDevRoute invalid gate', () => {
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

  runOrSkip('locks TIL interactions when source is invalid', async () => {
    const applyOneSpy = vi.spyOn(tsaAdapter, 'applyOne');
    const { container, root } = renderIntoDocument(<StepDevRoute />);

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

      updateSource('(2+3)+4');
      expect(textarea.value).toBe('(2+3)+4');
      await clickLoad();
      applyOneSpy.mockClear();

      const beforeInvalid = displayPanel.textContent;

      updateSource('(2+3');
      expect(textarea.value).toBe('(2+3');
      await clickLoad();

      const banner = container.querySelector('[data-testid="invalid-banner"]');
      expect(banner).not.toBeNull();
      expect(banner?.textContent ?? '').toContain('Invalid expression');
      expect(displayPanel.textContent).toBe(beforeInvalid);

      const plusToken = Array.from(displayPanel.querySelectorAll('[data-ast-id]')).find(
        (el) => el.textContent === '+'
      ) as HTMLElement | undefined;
      expect(plusToken).toBeTruthy();
      if (plusToken) {
        act(() => {
          plusToken.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
        });
      }
      expect(applyOneSpy).not.toHaveBeenCalled();
      expect(displayPanel.querySelectorAll('.t-selected').length).toBe(0);

      updateSource('(2+3)+4');
      expect(textarea.value).toBe('(2+3)+4');
      await clickLoad();

      expect(container.querySelector('[data-testid="invalid-banner"]')).toBeNull();

      const nextPlus = Array.from(displayPanel.querySelectorAll('[data-ast-id]')).find(
        (el) => el.textContent === '+'
      ) as HTMLElement | undefined;
      expect(nextPlus).toBeTruthy();
      applyOneSpy.mockClear();
      if (nextPlus) {
        act(() => {
          nextPlus.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
        });
      }
      expect(applyOneSpy).toHaveBeenCalled();
    } finally {
      act(() => {
        root.unmount();
      });
      applyOneSpy.mockRestore();
    }
  });
});
