import React from 'react';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import ReactDOMServer from 'react-dom/server';
import { StepDevRoute, evaluateFirstStep, resolveTextareaKey } from '..';

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

  it('applies the first rational step', () => {
    const outcome = evaluateFirstStep('((2/3) ÷ (5/7))');
    expect(outcome).toEqual({
      kind: 'plan-success',
      planId: 'divFractionsToReciprocal',
      rationale: ['PRIORITY:divFractionsToReciprocal', 'AST_PREORDER', 'ID_LEX'],
      nextExpr: '((2/3) × (7/5))'
    });
  });

  it('shows reasons when chooser fails', () => {
    const outcome = evaluateFirstStep('(5/11)');
    expect(outcome.kind).toBe('plan-failure');
    if (outcome.kind === 'plan-failure') {
      const codes = outcome.reasons.map((reason) => reason.code);
      expect(codes).toContain('PRECONDITION_FAILED');
    }
  });
});
