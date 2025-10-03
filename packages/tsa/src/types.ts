import type { Rational } from '@motor/core';

export type AST =
  | { type: 'Literal'; value: Rational }
  | { type: 'Mul'; left: AST; right: AST }
  | { type: 'Div'; left: AST; right: AST };

export type StepApplication = { ast: AST; rule: string; rationale: string[] };

export function literal(value: Rational): AST {
  return { type: 'Literal', value };
}

export function mul(left: AST, right: AST): AST {
  return { type: 'Mul', left, right };
}

export function div(left: AST, right: AST): AST {
  return { type: 'Div', left, right };
}

export function cloneAST(ast: AST): AST {
  switch (ast.type) {
    case 'Literal':
      return { type: 'Literal', value: { n: ast.value.n, d: ast.value.d } };
    case 'Mul':
      return { type: 'Mul', left: cloneAST(ast.left), right: cloneAST(ast.right) };
    case 'Div':
      return { type: 'Div', left: cloneAST(ast.left), right: cloneAST(ast.right) };
    default: {
      const neverAst: never = ast;
      return neverAst;
    }
  }
}
