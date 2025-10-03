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

  runOrSkip('shows a normalized trace after clicking apply', () => {
    const { container, root } = renderIntoDocument(<StepDevRoute />);

    const applyButton = container.querySelector('[data-testid="apply-button"]') as HTMLButtonElement;
    expect(applyButton).toBeTruthy();

    act(() => {
      applyButton.click();
    });

    const resultPanel = container.querySelector('[data-testid="result-panel"]');
    expect(resultPanel?.textContent).toContain('Normalized value: 14/15');

    act(() => {
      root.unmount();
    });
  });
});
