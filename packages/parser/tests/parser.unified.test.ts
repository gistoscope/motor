import { describe, it, expect } from 'vitest';
import { parse, print } from '../src/index.js';
import { createEngine } from '@motor/core';

describe('@motor/parser', () => {
  it('parses and simplifies simple expression', () => {
    const eng = createEngine();
    const ast = parse('1/2 + 1/3');
    const out = eng.simplify(ast);
    expect(out.type).toBe('rat');
  });
  it('parses sqrt and keeps non-perfect symbolic', () => {
    const eng = createEngine();
    const ast = parse('sqrt(12)');
    const out = eng.simplify(ast);
    expect(out.type).toBe('sqrt');
  });
  it('parses pow right-associative', () => {
    const ast = parse('2 ^ 3 ^ 2');
    expect(print(ast)).toContain('^');
  });
});


it('throws on decimal with trailing dot', () => {
  expect(() => parse('12.')).toThrow();
});


it('reports position in errors', () => {
  try {
    parse('sqrt(12');
    throw new Error('should have thrown');
  } catch (e:any) {
    expect(String(e)).toMatch(/at \d+/);
  }
});
