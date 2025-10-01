import { add, div, getAtPath } from '@motor/ast';
import { applyReplacement } from '../utils.js';
import type { StepFn } from '@motor/types';

const factorizeFractionSides: StepFn = (expr, path) => {
  const node = getAtPath(expr, path);
  if (!node) return null;
  if (node.type !== 'add') return null;
  if (node.args.length !== 2) return null;
  const [lhs, rhs] = node.args;
  if (lhs.type !== 'div' || rhs.type !== 'div') return null;
  const leftDen = JSON.stringify(lhs.right);
  const rightDen = JSON.stringify(rhs.right);
  if (leftDen !== rightDen) return null;
  const numerator = add(lhs.left, rhs.left);
  const replacement = div(numerator, lhs.right);
  return applyReplacement(expr, path, replacement, 'Factor out the common denominator across terms');
};

export default factorizeFractionSides;
