import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { StepDevRoute } from '..';

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

describe('StepDevRoute render trace', () => {
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

  runOrSkip('supports auto-run with undo/redo controls', () => {
    const { container, root } = renderIntoDocument(<StepDevRoute />);

    const applyButton = container.querySelector('[data-testid="apply-button"]') as HTMLButtonElement;
    expect(applyButton).toBeTruthy();

    act(() => {
      applyButton.click();
    });

    const rulesPanel = container.querySelector('[data-testid="rules-panel"]');
    expect(rulesPanel?.textContent).toContain('divFractionsToReciprocal');

    const autoButton = container.querySelector('[data-testid="auto-button"]') as HTMLButtonElement;
    expect(autoButton).toBeTruthy();
    expect(autoButton.disabled).toBe(false);

    act(() => {
      autoButton.click();
    });

    const resultPanel = container.querySelector('[data-testid="result-panel"]');
    expect(resultPanel?.textContent).toContain('Normalized value: 14/15');

    const undoButton = container.querySelector('[data-testid="undo-button"]') as HTMLButtonElement;
    const redoButton = container.querySelector('[data-testid="redo-button"]') as HTMLButtonElement;
    expect(undoButton.disabled).toBe(false);

    act(() => {
      undoButton.click();
    });

    expect(redoButton.disabled).toBe(false);

    act(() => {
      root.unmount();
    });
  });
});
