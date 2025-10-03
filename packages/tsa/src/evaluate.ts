import { R } from '@motor/core';
import type { Rational } from '@motor/core';
import type { AST } from './types';
import { reduceAndNormalize } from './reduce';

export function evaluateExpression(ast: AST): Rational | { error: string } {
  try {
    const value = evaluate(ast);
    return reduceAndNormalize(value);
  } catch (error) {
    if (error instanceof Error && error.message) {
      return { error: error.message };
    }
    return { error: 'UNKNOWN_ERROR' };
  }
}

function evaluate(ast: AST): Rational {
  switch (ast.type) {
    case 'Literal':
      return reduceAndNormalize(ast.value);
    case 'Mul': {
      const left = evaluate(ast.left);
      const right = evaluate(ast.right);
      return R.mul(left, right);
    }
    case 'Div': {
      const left = evaluate(ast.left);
      const right = evaluate(ast.right);
      if (right.n === 0n) {
        throw new Error('DIVISION_BY_ZERO');
      }
      return R.div(left, right);
    }
    default: {
      const neverAst: never = ast;
      return neverAst;
    }
  }
}
