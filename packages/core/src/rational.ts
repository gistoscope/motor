export type Rational = { n: bigint; d: bigint }; // normalized, d>0, gcd(|n|,d)=1

const abs = (x: bigint) => (x < 0n ? -x : x);

export const gcd = (a: bigint, b: bigint): bigint => {
  a = abs(a); b = abs(b);
  while (b !== 0n) { const t = b; b = a % b; a = t; }
  return a;
};

export const make = (n: bigint, d: bigint = 1n): Rational => {
  if (d === 0n) throw new Error('Zero denominator');
  if (n === 0n) return { n: 0n, d: 1n };
  if (d < 0n) { n = -n; d = -d; }
  const g = gcd(abs(n), d);
  return { n: n / g, d: d / g };
};

export const add = (a: Rational, b: Rational): Rational =>
  make(a.n * b.d + b.n * a.d, a.d * b.d);

export const sub = (a: Rational, b: Rational): Rational =>
  make(a.n * b.d - b.n * a.d, a.d * b.d);

export const mul = (a: Rational, b: Rational): Rational =>
  make(a.n * b.n, a.d * b.d);

export const div = (a: Rational, b: Rational): Rational => {
  if (b.n === 0n) throw new Error('Division by zero');
  return make(a.n * b.d, a.d * b.n);
};

export const powInt = (a: Rational, k: bigint): Rational => {
  if (k === 0n) return make(1n, 1n);
  if (k < 0n) { const p = powInt(a, -k); return make(p.d, p.n); }
  let n = 1n, d = 1n;
  for (let i = 0n; i < k; i++) { n *= a.n; d *= a.d; }
  return make(n, d);
};

export const isPerfectSquare = (x: bigint): boolean => {
  if (x < 0n) return false;
  let r = bigintSqrt(x);
  return r*r == x;
};

export const isPerfectCube = (x: bigint): boolean => {
  let r = bigintCbrt(x);
  return r*r*r == x;
};

// Integer sqrt via binary search
export const bigintSqrt = (n: bigint): bigint => {
  if (n < 0n) throw new Error('sqrt of negative');
  if (n < 2n) return n;
  let small = 0n, big = n;
  while (big - small > 1n) {
    const mid = (small + big) >> 1n;
    if (mid*mid <= n) small = mid; else big = mid;
  }
  return small;
};

export const bigintCbrt = (n: bigint): bigint => {
  const sign = n < 0n ? -1n : 1n;
  n = n < 0n ? -n : n;
  let small = 0n, big = n+1n;
  while (big - small > 1n) {
    const mid = (small + big) >> 1n;
    const cube = mid*mid*mid;
    if (cube <= n) small = mid; else big = mid;
  }
  return small * sign;
};

export const toString = (a: Rational): string => (a.d === 1n ? a.n.toString() : `${a.n}/${a.d}`);
