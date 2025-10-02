import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import DevStepPage from './DevStepPage';
import { applyStep } from '@motor/tsa';

describe('Dev step page', () => {
  it('renders the step builder page', () => {
    const html = renderToString(<DevStepPage />);
    expect(html).toContain('Step builder');
  });

  it('returns FRACTION_BAR_NO_INTEGER for простой бар', () => {
    const result = applyStep('простой бар');
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.reason.code).toBe('FRACTION_BAR_NO_INTEGER');
    }
  });

  it('returns FRACTION_BAR_COMPLEX for сложный бар', () => {
    const result = applyStep('сложный бар');
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.reason.code).toBe('FRACTION_BAR_COMPLEX');
    }
  });
});
