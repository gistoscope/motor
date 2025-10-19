import { describe, expect, it } from 'vitest';

import { AST, R, createEngine, fromJSON, print, toJSON } from '@motor/core';

describe('@motor/core package contract', () => {
  it('exposes arithmetic constructors and rational helpers', () => {
    expect(typeof AST.add).toBe('function');
    expect(typeof AST.mul).toBe('function');
    expect(typeof AST.pow).toBe('function');
    expect(typeof R.make).toBe('function');
    expect(typeof R.add).toBe('function');
  });

  it('creates an engine that simplifies expressions', () => {
    const engine = createEngine();
    const expr = AST.add(AST.rat(2n), AST.rat(3n));

    const simplified = engine.simplify(expr);
    expect(simplified).toEqual(AST.rat(5n));
    expect(engine.print(simplified)).toBe('5');
  });

  it('round-trips expressions through JSON helpers', () => {
    const original = AST.div(AST.mul(AST.rat(6n), AST.rat(1n)), AST.rat(2n));
    const encoded = toJSON(original);
    const decoded = fromJSON(encoded);

    expect(decoded).toEqual(original);
    expect(print(decoded)).toBe('6 / 2');
  });
});
