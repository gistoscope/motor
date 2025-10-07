import { describe, it, expect } from 'vitest';
import {
  parseStage2Expression,
  evaluateExpression,
  formatRational,
} from '../src'; // TSA re-exports stage2 & stage1 helpers via index

function evalToString(src: string): string {
  const ast = parseStage2Expression(src);
  const out = evaluateExpression(ast);
  if ('error' in out) throw new Error(out.error);
  return formatRational(out);
}

describe('TSA Golden Set 02 — stage2: precedence, parentheses, negatives', () => {
  it('handles unary minus', () => {
    expect(evalToString('-3*4')).toBe('-12');
    expect(evalToString('-(3*4)')).toBe('-12');
    expect(evalToString('(-3)*(-4)')).toBe('12');
  });

  it('respects precedence: * and / before + and -', () => {
    expect(evalToString('2-3*4')).toBe('-10');   // 2 - (3*4)
    expect(evalToString('10-6/3')).toBe('8');    // 10 - (6/3)
    expect(evalToString('2+8/4*3')).toBe('8');   // 2 + ((8/4)*3)
  });

  it('parentheses override precedence', () => {
    expect(evalToString('(2-3)*4')).toBe('-4');
    expect(evalToString('2-(3*4)')).toBe('-10');
    expect(evalToString('(2+8)/(3-1)')).toBe('5'); // 10/2
  });

  it.todo('decimals: 2.5 + 1.25 -> 3.75 (expected 15/4), pending decimal parser');
});
