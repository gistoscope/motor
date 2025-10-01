import { rat } from '@motor/ast';
import type { Expr, Path, StepFn, StepResult } from '@motor/types';
import { replaceAtPath } from '@motor/ast';

export const gcd = (a: bigint, b: bigint): bigint => {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
};

export const reduce = (n: bigint, d: bigint): { n: bigint; d: bigint } => {
  const g = gcd(n, d);
  if (g === 0n) {
    return { n, d };
  }
  return { n: n / g, d: d / g };
};

export const applyReplacement = (expr: Expr, path: Path, node: Expr, description: string): StepResult => ({
  changed: true,
  expr: replaceAtPath(expr, path, node),
  path,
  description
});

export const noop: StepFn = () => null;

export const asFraction = (n: bigint, d: bigint = 1n) => rat(n, d);
