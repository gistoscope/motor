import type { Expr, ExprJSON, Rational } from '@motor/types';

export const rat = (n: bigint, d: bigint = 1n): Expr => ({ type: 'rat', value: norm({ n, d }) });
export const add = (...args: Expr[]): Expr => ({ type: 'add', args });
export const mul = (...args: Expr[]): Expr => ({ type: 'mul', args });
export const sub = (left: Expr, right: Expr): Expr => ({ type: 'sub', left, right });
export const div = (left: Expr, right: Expr): Expr => ({ type: 'div', left, right });
export const pow = (left: Expr, right: Expr): Expr => ({ type: 'pow', left, right });
export const sqrt = (arg: Expr): Expr => ({ type: 'sqrt', arg });
export const cbrt = (arg: Expr): Expr => ({ type: 'cbrt', arg });

function norm({ n, d }: Rational): Rational {
  if (d === 0n) throw new Error('Denominator cannot be zero');
  return d < 0n ? { n: -n, d: -d } : { n, d };
}

export function toJSON(expr: Expr): ExprJSON {
  switch (expr.type) {
    case 'rat':
      return { type: 'rat', n: expr.value.n.toString(), d: expr.value.d.toString() };
    case 'add':
      return { type: 'add', args: expr.args.map(toJSON) };
    case 'mul':
      return { type: 'mul', args: expr.args.map(toJSON) };
    case 'sub':
      return { type: 'sub', left: toJSON(expr.left), right: toJSON(expr.right) };
    case 'div':
      return { type: 'div', left: toJSON(expr.left), right: toJSON(expr.right) };
    case 'pow':
      return { type: 'pow', left: toJSON(expr.left), right: toJSON(expr.right) };
    case 'sqrt':
      return { type: 'sqrt', arg: toJSON(expr.arg) };
    case 'cbrt':
      return { type: 'cbrt', arg: toJSON(expr.arg) };
  }
}

export function fromJSON(json: ExprJSON): Expr {
  switch (json.type) {
    case 'rat':
      return rat(BigInt(json.n), BigInt(json.d));
    case 'add':
      return add(...json.args.map(fromJSON));
    case 'mul':
      return mul(...json.args.map(fromJSON));
    case 'sub':
      return sub(fromJSON(json.left), fromJSON(json.right));
    case 'div':
      return div(fromJSON(json.left), fromJSON(json.right));
    case 'pow':
      return pow(fromJSON(json.left), fromJSON(json.right));
    case 'sqrt':
      return sqrt(fromJSON(json.arg));
    case 'cbrt':
      return cbrt(fromJSON(json.arg));
  }
}

export const clone = (expr: Expr): Expr => fromJSON(toJSON(expr));
