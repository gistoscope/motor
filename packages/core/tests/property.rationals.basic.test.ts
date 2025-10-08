import { describe, it, expect } from 'vitest';
import { R } from '../src/index.js';

const SAMPLE_NUMERATORS = [-2n, -1n, 0n, 1n, 2n];
const SAMPLE_DENOMINATORS = [-3n, -2n, -1n, 1n, 2n, 3n];

const asKey = (value: R.Rational) => `${value.n.toString()}/${value.d.toString()}`;

const unwrap = (value: R.Rational): R.Rational => ({ n: value.n, d: value.d });

describe('@motor/core rational basics', () => {
  it('normalizes signs with positive denominators', () => {
    for (const n of SAMPLE_NUMERATORS) {
      for (const d of SAMPLE_DENOMINATORS) {
        if (d === 0n) {
          continue;
        }
        const rational = R.make(n, d);
        expect(rational.d > 0n).toBe(true);
        if (n === 0n) {
          expect(rational.n).toBe(0n);
        } else {
          const signN = n < 0n ? -1n : 1n;
          const signD = d < 0n ? -1n : 1n;
          const expectedSign = signN * signD;
          expect(rational.n < 0n ? -1n : 1n).toBe(expectedSign);
        }
      }
    }
  });

  it('reduces zero numerators to 0/1 regardless of denominator', () => {
    for (const d of SAMPLE_DENOMINATORS) {
      if (d === 0n) {
        continue;
      }
      const zero = R.make(0n, d);
      expect(zero.n).toBe(0n);
      expect(zero.d).toBe(1n);
    }
  });

  it('cancels common factors across a small domain', () => {
    const seen = new Set<string>();
    for (const n of SAMPLE_NUMERATORS) {
      for (const d of SAMPLE_DENOMINATORS) {
        if (d === 0n || n === 0n) {
          continue;
        }
        const reduced = R.make(n * 2n, d * 2n);
        const canonical = R.make(n, d);
        expect(asKey(reduced)).toBe(asKey(canonical));
        seen.add(asKey(canonical));
      }
    }
    expect(seen.size).toBeGreaterThan(0);
  });

  it('respects associativity for addition and multiplication on sample rationals', () => {
    const samples = SAMPLE_NUMERATORS.filter((n) => n !== 0n).map((n) => R.make(n, 3n));
    samples.push(R.make(0n, 1n));

    for (let i = 0; i < samples.length; i++) {
      for (let j = 0; j < samples.length; j++) {
        for (let k = 0; k < samples.length; k++) {
          const a = unwrap(samples[i]!);
          const b = unwrap(samples[j]!);
          const c = unwrap(samples[k]!);

          const addLeft = R.add(R.add(a, b), c);
          const addRight = R.add(a, R.add(b, c));
          expect(asKey(addLeft)).toBe(asKey(addRight));

          const mulLeft = R.mul(R.mul(a, b), c);
          const mulRight = R.mul(a, R.mul(b, c));
          expect(asKey(mulLeft)).toBe(asKey(mulRight));
        }
      }
    }
  });
});
