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

describe('TSA Golden Set 04 — whitespace & formatting tolerance', () => {
  it('ignores ASCII whitespace between tokens', () => {
    expect(evalToString('  2  +   3 *   4  ')).toBe('14');
    expect(evalToString(' ( 2 + 8 ) / ( 3 - 1 ) ')).toBe('5');
  });

  it('allows tabs and newlines', () => {
    expect(evalToString('\t(2\t+\t3)\t*\t4')).toBe('20');
    expect(evalToString('2+\n8/4*3')).toBe('8');
    expect(evalToString('(\n2+8\n)/(\n3-1\n)')).toBe('5');
  });

  it('permits unary negation only in the documented contexts', () => {
    expect(evalToString('-3*4')).toBe('-12');
    expect(evalToString('-(3 + 5)')).toBe('-8');    // no space between '-' and '('
    expect(evalToString('2 * (-3)')).toBe('-6');
    expect(evalToString('10 / (-5)')).toBe('-2');
  });
});
