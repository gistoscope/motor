import { describe, it, expect } from 'vitest';
import { parse, print } from '../src/index.js';
import { toJSON, AST } from '@motor/core';

const normalize = (expr: string) => toJSON(parse(expr));

describe('@motor/parser whitespace & sign fixtures', () => {
  it('ignores redundant leading and trailing whitespace', () => {
    const messy = '   1/2   +   3/4   ';
    const tight = '1/2+3/4';
    expect(normalize(messy)).toEqual(normalize(tight));
  });

  it('treats spaced subtraction as addition with a negative term', () => {
    const source = '5    -    2';
    const ast = parse(source);
    const expected = AST.add(
      AST.rat(5n, 1n),
      AST.mul(AST.rat(-1n, 1n), AST.rat(2n, 1n))
    );
    expect(print(ast)).toBe('5 + -1 * 2');
    expect(toJSON(ast)).toEqual(toJSON(expected));
  });

  it('produces a stable AST for mixed fraction arithmetic with irregular spaces', () => {
    const messy = ' ( 1/2  *  3/4 )  / ( 5/6 ) ';
    const tidy = '(1/2 * 3/4) / (5/6)';
    expect(normalize(messy)).toEqual(normalize(tidy));
    expect(print(parse(messy))).toBe(print(parse(tidy)));
  });

  it('models a unary-looking negative via subtraction from zero', () => {
    const messy = '   0   -   1/2';
    const tidy = '0-1/2';
    expect(normalize(messy)).toEqual(normalize(tidy));
    expect(print(parse(messy))).toBe(print(parse(tidy)));
  });
});
