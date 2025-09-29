import type { Rational } from './rational.js';

export type Nary = { type: 'add'|'mul', args: Expr[] };
export type Bin = { type: 'sub'|'div'|'pow', left: Expr, right: Expr };
export type Uni = { type: 'sqrt'|'cbrt', arg: Expr };
export type Rat = { type: 'rat', value: Rational };

export type Expr = Nary | Bin | Uni | Rat;

export const rat = (n: bigint, d: bigint = 1n): Expr => ({ type: 'rat', value: { n, d } });
export const add = (...xs: Expr[]): Expr => ({ type: 'add', args: xs });
export const mul = (...xs: Expr[]): Expr => ({ type: 'mul', args: xs });
export const sub = (l: Expr, r: Expr): Expr => ({ type: 'sub', left: l, right: r });
export const div = (l: Expr, r: Expr): Expr => ({ type: 'div', left: l, right: r });
export const pow = (l: Expr, r: Expr): Expr => ({ type: 'pow', left: l, right: r });
export const sqrt = (a: Expr): Expr => ({ type: 'sqrt', arg: a });
export const cbrt = (a: Expr): Expr => ({ type: 'cbrt', arg: a });


export type ExprJSON =
  | { type: 'rat', n: string, d: string }
  | { type: 'add', args: ExprJSON[] }
  | { type: 'mul', args: ExprJSON[] }
  | { type: 'sub'|'div'|'pow', left: ExprJSON, right: ExprJSON }
  | { type: 'sqrt'|'cbrt', arg: ExprJSON };

export function toJSON(e: Expr): ExprJSON {
  switch (e.type) {
    case 'rat': return { type: 'rat', n: e.value.n.toString(), d: e.value.d.toString() };
    case 'add': return { type: 'add', args: e.args.map(toJSON) };
    case 'mul': return { type: 'mul', args: e.args.map(toJSON) };
    case 'sub': return { type: 'sub', left: toJSON(e.left), right: toJSON(e.right) };
    case 'div': return { type: 'div', left: toJSON(e.left), right: toJSON(e.right) };
    case 'pow': return { type: 'pow', left: toJSON(e.left), right: toJSON(e.right) };
    case 'sqrt': return { type: 'sqrt', arg: toJSON(e.arg) };
    case 'cbrt': return { type: 'cbrt', arg: toJSON(e.arg) };
  }
}

export function fromJSON(j: ExprJSON): Expr {
  switch (j.type) {
    case 'rat': return rat(BigInt(j.n), BigInt(j.d));
    case 'add': return add(...j.args.map(fromJSON));
    case 'mul': return mul(...j.args.map(fromJSON));
    case 'sub': return sub(fromJSON(j.left), fromJSON(j.right));
    case 'div': return div(fromJSON(j.left), fromJSON(j.right));
    case 'pow': return pow(fromJSON(j.left), fromJSON(j.right));
    case 'sqrt': return sqrt(fromJSON(j.arg));
    case 'cbrt': return cbrt(fromJSON(j.arg));
    default: throw new Error('Unknown JSON node');
  }
}
