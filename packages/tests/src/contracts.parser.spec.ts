import { describe, expect, it } from 'vitest';

import { ParseError, parse, print, tokenize } from '@motor/parser';

describe('@motor/parser package contract', () => {
  it('tokenizes basic expressions', () => {
    const tokens = tokenize('2 + sqrt(9)');
    expect(tokens.map((token) => token.t)).toEqual([
      'num',
      'op',
      'ident',
      'lpar',
      'num',
      'rpar',
      'eof',
    ]);
  });

  it('parses expressions compatible with @motor/core printing', () => {
    const expr = parse('2+3*4');
    expect(print(expr)).toBe('2 + 3 * 4');

    const nested = parse('sqrt(9)');
    expect(print(nested)).toBe('sqrt(9)');
  });

  it('throws a ParseError for unsupported syntax', () => {
    expect(() => parse('1.5')).toThrow(ParseError);
    expect(() => parse('unknown(2)')).toThrow(ParseError);
  });
});
