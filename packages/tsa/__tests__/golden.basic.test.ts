import { describe, it, expect } from 'vitest';
import { parseStage1Expression, formatRational } from '../src/stage1.js';
import { parseStage2Expression } from '../src/stage2.js';
import { evaluateExpression } from '../src/evaluate.js';
import { reduceAndNormalize } from '../src/reduce.js';

function must(r: unknown) {
  if (typeof r === 'object' && r !== null && 'error' in r) {
    throw new Error((r as any).error);
  }
  return r as any; // Rational
}

describe('TSA Golden Set 01', () => {
  it('Stage1: mul/div of rationals', () => {
    const a1 = parseStage1Expression('(2/3) * (3/4)');
    const r1 = must(evaluateExpression(a1));
    expect(formatRational(reduceAndNormalize(r1))).toBe('1/2');

    const a2 = parseStage1Expression('(1/5) / (2/5)');
    const r2 = must(evaluateExpression(a2));
    expect(formatRational(reduceAndNormalize(r2))).toBe('1/2');
  });

  it('Stage2: +/−, ×/÷, parentheses', () => {
    const a1 = parseStage2Expression('1/2 + 1/4');
    const r1 = must(evaluateExpression(a1));
    expect(formatRational(reduceAndNormalize(r1))).toBe('3/4');

    const a2 = parseStage2Expression('2/3 * (3/2)');
    const r2 = must(evaluateExpression(a2));
    expect(formatRational(reduceAndNormalize(r2))).toBe('1');

    const a3 = parseStage2Expression('(-1/4) + (1/2)');
    const r3 = must(evaluateExpression(a3));
    expect(formatRational(reduceAndNormalize(r3))).toBe('1/4');
  });
});
