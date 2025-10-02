import { describe, expect, it } from 'vitest';
import {
  chooseFirstStep,
  divFractionsToReciprocal,
  mulFractionsToSingle,
  reduceFraction,
  normalizeSigns
} from '../src';

const PRECONDITION = [{ code: 'PRECONDITION_FAILED' }];

describe('OSS-1 rational atoms and chooser', () => {
  it('is deterministic for identical input', () => {
    const input = '((2/3) ÷ (5/7))';
    const first = chooseFirstStep(input);
    const second = chooseFirstStep(input);
    if (!first.ok || !second.ok) {
      throw new Error('chooser should succeed');
    }
    expect(second.value.id).toBe(first.value.id);
    expect(second.value.rationale).toEqual(first.value.rationale);
  });

  it('picks divFractionsToReciprocal when applicable', () => {
    const input = '((2/3) ÷ (5/7))';
    const plan = chooseFirstStep(input);
    expect(plan).toEqual({
      ok: true,
      value: {
        id: 'divFractionsToReciprocal',
        rationale: ['PRIORITY:divFractionsToReciprocal', 'AST_PREORDER', 'ID_LEX']
      }
    });

    const transformed = divFractionsToReciprocal(input);
    expect(transformed).toEqual({
      ok: true,
      value: { expr: '((2/3) × (7/5))' }
    });
  });

  it('picks mulFractionsToSingle when applicable', () => {
    const input = '((2/3) × (5/7))';
    const plan = chooseFirstStep(input);
    expect(plan).toEqual({
      ok: true,
      value: {
        id: 'mulFractionsToSingle',
        rationale: ['PRIORITY:mulFractionsToSingle', 'AST_PREORDER', 'ID_LEX']
      }
    });

    const transformed = mulFractionsToSingle(input);
    expect(transformed).toEqual({
      ok: true,
      value: { expr: '((2*5)/(3*7))' }
    });
  });

  it('reduces fractions', () => {
    const input = '(6/8)';
    const plan = chooseFirstStep(input);
    expect(plan).toEqual({
      ok: true,
      value: {
        id: 'reduceFraction',
        rationale: ['PRIORITY:reduceFraction', 'AST_PREORDER', 'ID_LEX']
      }
    });

    const transformed = reduceFraction(input);
    expect(transformed).toEqual({
      ok: true,
      value: { expr: '(3/4)' }
    });
  });

  it('normalizes signs', () => {
    const input = '(-2)/(-3)';
    const plan = chooseFirstStep(input);
    expect(plan).toEqual({
      ok: true,
      value: {
        id: 'normalizeSigns',
        rationale: ['PRIORITY:normalizeSigns', 'AST_PREORDER', 'ID_LEX']
      }
    });

    const transformed = normalizeSigns(input);
    expect(transformed).toEqual({
      ok: true,
      value: { expr: '(2/3)' }
    });
  });

  it('returns failure when no atom applies', () => {
    const input = '1 + (2/3)';
    expect(chooseFirstStep(input)).toEqual({ ok: false, reasons: PRECONDITION });
  });
});
