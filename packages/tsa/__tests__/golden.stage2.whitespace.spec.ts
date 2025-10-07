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

describe('TSA Golden Set 04 — whitespace & newlines', () => {
  it('ignores regular spaces', () => {
    expect(evalToString('  2  +   3 *   4  ')).toBe('14');
    expect(evalToString(' ( 2 + 8 ) / ( 3 - 1 ) ')).toBe('5');
  });

  it('handles tabs and mixed spacing', () => {
    expect(evalToString('\t(2\t+\t3)\t*\t4')).toBe('20');
    expect(evalToString('2\t-\t( -3 )')).toBe('5'); // правило со скобками сохранено
  });

  it('handles newlines inside expression', () => {
    expect(evalToString('2+\n8/4*3')).toBe('8');
    expect(evalToString('(\n2+8\n)/(\n3-1\n)')).toBe('5');
  });

  it('still rejects consecutive signs without parentheses', () => {
    expect(() => parseStage2Expression('3--2')).toThrow();
    expect(() => parseStage2Expression('2*-3')).toThrow();
    expect(() => parseStage2Expression('10/-5')).toThrow();
  });

  it('still rejects malformed decimals with whitespace around', () => {
    expect(() => parseStage2Expression('2..5')).toThrow();
    expect(() => parseStage2Expression('5.\n')).toThrow();
  });

  it('allows permitted negatives with whitespace + parentheses', () => {
    expect(evalToString('-3*4')).toBe('-12');      // унарный в начале — ок
    expect(evalToString('2 * ( -3 )')).toBe('-6'); // после оператора — только со скобками
    expect(evalToString('10 / ( -5 )')).toBe('-2');
  });
});
