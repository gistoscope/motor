import { toJSON, fromJSON } from '../src/expr.js';
import { describe, it, expect } from 'vitest';
import { createEngine, AST, R } from '../src/index.js';

// JSON.stringify не умеет BigInt — приводим BigInt к строке в тестах
const J = (x: unknown) =>
  JSON.stringify(x, (_k, v) => (typeof v === 'bigint' ? v.toString() : v));

describe('@motor/core unified', () => {
  it('normalizes rationals', () => {
    const a = R.make(2n, 4n);
    expect(R.toString(a)).toBe('1/2');
  });

  it('adds rationals (1/2 + 1/3 = 5/6)', () => {
    const eng = createEngine();
    const expr = AST.add(AST.rat(1n, 2n), AST.rat(1n, 3n));
    const out = eng.simplify(expr);
    expect(out.type).toBe('rat');
    if (out.type === 'rat') {
      expect(out.value.n).toBe(5n);
      expect(out.value.d).toBe(6n);
    }
  });

  it('idempotent simplify', () => {
    const eng = createEngine();
    const expr = AST.add(AST.rat(2n, 4n), AST.rat(2n, 4n));
    const once = eng.simplify(expr);
    const twice = eng.simplify(once);
    expect(J(once)).toBe(J(twice));
  });

  it('perfect power under sqrt', () => {
    const eng = createEngine();
    const e1 = AST.sqrt(AST.rat(9n, 4n));
    const out = eng.simplify(e1);
    expect(out.type).toBe('rat');
    if (out.type === 'rat') {
      expect(R.toString(out.value)).toBe('3/2');
    }
  });

  it('non-perfect sqrt stays symbolic', () => {
    const eng = createEngine();
    const e = AST.sqrt(AST.rat(12n, 1n));
    const out = eng.simplify(e);
    expect(out.type).toBe('sqrt');
  });

  it('pow with integer exponent', () => {
    const eng = createEngine();
    const e = AST.pow(AST.rat(2n, 3n), AST.rat(3n, 1n));
    const out = eng.simplify(e);
    expect(out.type).toBe('rat');
    if (out.type === 'rat') {
      expect(R.toString(out.value)).toBe('8/27');
    }
  });
});

it('negative sqrt stays symbolic', () => {
  const eng = createEngine();
  const e = AST.sqrt(AST.rat(-9n, 4n));
  const out = eng.simplify(e);
  expect(out.type).toBe('sqrt');
});

it('roundtrip JSON', () => {
  const e = AST.mul(
    AST.add(AST.rat(1n, 2n), AST.rat(1n, 3n)),
    AST.sqrt(AST.rat(9n, 1n))
  );
  const j = toJSON(e as any);
  const e2 = fromJSON(j as any);
  expect(J(e2)).toBe(J(e));
});
