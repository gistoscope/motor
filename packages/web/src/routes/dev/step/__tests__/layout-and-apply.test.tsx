import React from 'react';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import ReactDOMServer from 'react-dom/server';
import { StepDevRoute, evaluateTrace, resolveTextareaKey } from '..';

describe('dev step route layout and apply', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_EXPERIMENTAL_M0', 'true');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('renders display above the input panel', () => {
    const markup = ReactDOMServer.renderToStaticMarkup(<StepDevRoute />);
    const displayIndex = markup.indexOf('data-testid="display-panel"');
    const inputIndex = markup.indexOf('data-testid="input-panel"');
    expect(displayIndex).toBeGreaterThanOrEqual(0);
    expect(inputIndex).toBeGreaterThan(displayIndex);
  });

  it('enables textarea resize via CSS', () => {
    const markup = ReactDOMServer.renderToStaticMarkup(<StepDevRoute />);
    expect(markup).toContain('style="resize:vertical"');
  });

  it('maps keyboard shortcuts', () => {
    expect(resolveTextareaKey({ key: 'Enter' })).toBe('apply');
    expect(resolveTextareaKey({ key: 'Enter', shiftKey: true })).toBeNull();
    expect(resolveTextareaKey({ key: 'Escape' })).toBe('clear');
  });

  it('generates a full trace with normalized result', () => {
    const outcome = evaluateTrace('((2/3) ÷ (5/7))');
    expect(outcome.kind).toBe('trace');
    if (outcome.kind === 'trace') {
      const rules = outcome.steps.map((step) => step.rule);
      expect(rules).toEqual([
        'divFractionsToReciprocal',
        'mulFractionsToSingle',
        'multiplyLiterals',
        'multiplyLiterals',
        'divideLiterals'
      ]);
      expect(outcome.finalValue).toBe('14/15');
      expect(outcome.finalExpression).toBe('(14/15)');
    }
  });

  it('generates a multi-step trace for addition', () => {
    const outcome = evaluateTrace('((2/3) + (5/7))');
    expect(outcome.kind).toBe('trace');
    if (outcome.kind === 'trace') {
      const rules = outcome.steps.map((step) => step.rule);
      expect(rules).toEqual([
        'addFractionsToCommonDenominator',
        'multiplyLiterals',
        'multiplyLiterals',
        'multiplyLiterals',
        'addLiterals',
        'divideLiterals'
      ]);
      expect(outcome.finalValue).toBe('29/21');
      expect(outcome.finalExpression).toBe('(29/21)');
    }
  });

  it('surfaces parser errors', () => {
    const outcome = evaluateTrace('((2/3) ÷)');
    expect(outcome).toMatchObject({ kind: 'error', message: expect.stringContaining('Expected number') });
  });
});
