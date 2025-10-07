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

  // Теперь недопустимые записи должны падать на парсинге:
  it('rejects "3--2" (must be 3-(-2))', () => {
    expect(() => parseStage2Expression('3--2')).toThrow();
  });
  it('rejects "2*-3" (must be 2*(-3))', () => {
    expect(() => parseStage2Expression('2*-3')).toThrow();
  });
  it('rejects "10/-5" (must be 10/(-5))', () => {
    expect(() => parseStage2Expression('10/-5')).toThrow();
  });
  it('rejects "--3" (must be -(3))', () => {
    expect(() => parseStage2Expression('--3')).toThrow();
  });
  it('rejects "2.5*-1" (must be 2.5*(-1))', () => {
    expect(() => parseStage2Expression('2.5*-1')).toThrow();
  });
});
