import { describe, it, expect } from 'vitest';
import {
  parseStage2Expression,
  evaluateExpression,
  formatRational,
} from '../src';

function evalToString(src: string): string {
  const ast = parseStage2Expression(src);
  const out = evaluateExpression(ast);
  if ('error' in out) throw new Error(out.error);
  return formatRational(out);
}

describe('TSA Golden Set 02b — no consecutive signs; parentheses required', () => {
  it('allows negatives after operator only with parentheses', () => {
    expect(evalToString('3-(-2)')).toBe('5');
    expect(evalToString('2*(-3)')).toBe('-6');
    expect(evalToString('(2+3)*(-4)')).toBe('-20');
    expect(evalToString('10/(-5)')).toBe('-2');
    expect(evalToString('2.5*(-1)')).toBe('-5/2');
  });

  // Pending: will be enabled in CD2 when tokenizer starts rejecting these.
  it.todo('rejects "3--2" (must be 3-(-2))');
  it.todo('rejects "2*-3" (must be 2*(-3))');
  it.todo('rejects "10/-5" (must be 10/(-5))');
  it.todo('rejects "--3" (must be -(3))');
  it.todo('rejects "2.5*-1" (must be 2.5*(-1))');
});
