import * as R from './rational.js';
import type { Expr } from './expr.js';
import * as E from './expr.js';

export interface Engine {
  simplify: (e: Expr) => Expr;
  evaluate: (e: Expr) => Expr; // == simplify on Stage-1
  print: (e: Expr) => string;
}

const isRat = (e: Expr): e is { type: 'rat'; value: R.Rational } => e.type === 'rat';
const mkRat = (n: bigint, d: bigint = 1n): Expr => ({ type: 'rat', value: R.make(n, d) });

/** JSON.stringify не умеет BigInt — приводим BigInt к строке */
const jsonStable = (x: unknown) =>
  JSON.stringify(x, (_k, v) => (typeof v === 'bigint' ? v.toString() : v));

const flatten = (e: Expr): Expr => {
  if (e.type === 'add') {
    const args: Expr[] = [];
    for (const a of e.args) {
      const s = flatten(a);
      if (s.type === 'add') args.push(...s.args);
      else args.push(s);
    }
    return { type: 'add', args };
  }
  if (e.type === 'mul') {
    const args: Expr[] = [];
    for (const a of e.args) {
      const s = flatten(a);
      if (s.type === 'mul') args.push(...s.args);
      else args.push(s);
    }
    return { type: 'mul', args };
  }
  if (e.type === 'sub') return { type: 'sub', left: flatten(e.left), right: flatten(e.right) };
  if (e.type === 'div') return { type: 'div', left: flatten(e.left), right: flatten(e.right) };
  if (e.type === 'pow') return { type: 'pow', left: flatten(e.left), right: flatten(e.right) };
  if (e.type === 'sqrt' || e.type === 'cbrt') return { ...e, arg: flatten(e.arg) };
  return e;
};

function simplifyOnce(e: Expr): Expr {
  e = flatten(e);
  switch (e.type) {
    case 'rat':
      return { ...e, value: R.make(e.value.n, e.value.d) };

    case 'add': {
      const terms = e.args.map(simplifyOnce);
      let acc: R.Rational | null = null;
      const rest: Expr[] = [];
      for (const t of terms) {
        if (isRat(t)) acc = acc ? R.add(acc, t.value) : t.value;
        else rest.push(t);
      }
      const out: Expr[] = [];
      if (acc) {
        const r = R.make(acc.n, acc.d);
        if (!(r.n === 0n)) out.push({ type: 'rat', value: r });
      }
      out.push(...rest);
      if (out.length === 0) return mkRat(0n, 1n);
      if (out.length === 1) return out[0];
      return { type: 'add', args: out };
    }

    case 'mul': {
      const factors = e.args.map(simplifyOnce);
      let acc: R.Rational | null = { n: 1n, d: 1n };
      const rest: Expr[] = [];
      for (const f of factors) {
        if (isRat(f)) acc = R.mul(acc!, f.value);
        else rest.push(f);
      }
      if (acc!.n === 0n) return mkRat(0n, 1n);
      const out: Expr[] = [];
      const r = R.make(acc!.n, acc!.d);
      if (!(r.n === 1n && r.d === 1n)) out.push({ type: 'rat', value: r });
      out.push(...rest);
      if (out.length === 0) return mkRat(1n, 1n);
      if (out.length === 1) return out[0];
      return { type: 'mul', args: out };
    }

    case 'sub': {
      return simplifyOnce(E.add(e.left, E.mul(mkRat(-1n), e.right)));
    }

    case 'div': {
      // only convert when denominator simplifies to a rational
      const L = simplifyOnce(e.left);
      const Rr = simplifyOnce(e.right);
      if (isRat(Rr)) {
        if (Rr.value.n === 0n) return { type: 'div', left: L, right: Rr }; // leave invalid, avoid throw
        return simplifyOnce(E.mul(L, mkRat(Rr.value.d, Rr.value.n)));
      }
      return { type: 'div', left: L, right: Rr };
    }

    case 'pow': {
      const Ls = simplifyOnce(e.left);
      const Rs = simplifyOnce(e.right);
      if (isRat(Ls) && isRat(Rs) && Rs.value.d === 1n) {
        const p = R.powInt(Ls.value, Rs.value.n);
        return mkRat(p.n, p.d);
      }
      return { type: 'pow', left: Ls, right: Rs };
    }

    case 'sqrt':
    case 'cbrt': {
      const A = simplifyOnce(e.arg);
      if (isRat(A)) {
        const num = A.value.n;
        const den = A.value.d;
        // Negative under sqrt stays symbolic
        if (e.type === 'sqrt' && num < 0n) return { ...e, arg: A };
        const root = e.type === 'sqrt' ? 2n : 3n;
        const perfect =
          root === 2n
            ? (x: bigint) => {
                if (x < 0n) return null;
                const r = R.bigintSqrt(x);
                return r * r === x ? r : null;
              }
            : (x: bigint) => {
                const r = R.bigintCbrt(x);
                return r * r * r === x ? r : null;
              };
        const rn = perfect(num < 0n ? -num : num);
        const rd = perfect(den);
        if (rn !== null && rd !== null) {
          const sign = e.type === 'sqrt' ? (num < 0n ? null : 1n) : 1n; // sqrt(negative) not simplified
          if (sign === 1n) {
            const value = R.make(rn * (num < 0n ? -1n : 1n), rd);
            return { type: 'rat', value };
          }
        }
      }
      return { ...e, arg: A };
    }
  }
}

export const print = (e: Expr): string => {
  const prec = (x: Expr): number => {
    switch (x.type) {
      case 'rat':
        return 4;
      case 'sqrt':
      case 'cbrt':
        return 4;
      case 'pow':
        return 3;
      case 'mul':
        return 2;
      case 'div':
        return 2;
      case 'add':
        return 1;
      case 'sub':
        return 1;
      default:
        return 0;
    }
  };
  const need = (parent: number, child: Expr) => prec(child) < parent;
  const p = (x: Expr, parent = 0): string => {
    switch (x.type) {
      case 'rat':
        return R.toString(R.make(x.value.n, x.value.d));
      case 'add':
        return x.args.map(a => p(a, 1)).join(' + ');
      case 'mul':
        return x.args.map(a => p(a, 2)).join(' * ');
      case 'sub': {
        const l = p(x.left, 1),
          r = p(x.right, 1);
        return `${l} - ${r}`;
      }
      case 'div': {
        const l = p(x.left, 2),
          r = p(x.right, 2);
        return `${need(2, x.left) ? '(' + l + ')' : l} / ${need(2, x.right) ? '(' + r + ')' : r}`;
      }
      case 'pow': {
        const l = p(x.left, 3),
          r = p(x.right, 3);
        return `${need(3, x.left) ? '(' + l + ')' : l} ^ ${need(3, x.right) ? '(' + r + ')' : r}`;
      }
      case 'sqrt':
        return `sqrt(${p(x.arg, 4)})`;
      case 'cbrt':
        return `cbrt(${p(x.arg, 4)})`;
    }
  };
  return p(e, 0);
};

export const createEngine = (): Engine => {
  const simplify = (e: Expr): Expr => {
    let cur = e;
    while (true) {
      const next = simplifyOnce(cur);
      if (jsonStable(next) === jsonStable(cur)) break;
      cur = next;
    }
    return cur;
  };
  const evaluate = (e: Expr): Expr => simplify(e);
  return { simplify, evaluate, print };
};
