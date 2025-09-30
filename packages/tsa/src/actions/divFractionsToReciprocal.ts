import { getAtPath, mul, pow } from '@motor/ast';
import { asFraction, applyReplacement } from '../utils.js';
import type { StepFn } from '@motor/types';

const divFractionsToReciprocal: StepFn = (expr, path) => {
  const node = getAtPath(expr, path);
  if (!node || node.type !== 'div') return null;
  const replacement = mul(node.left, pow(node.right, asFraction(-1n, 1n)));
  return applyReplacement(expr, path, replacement, 'Rewrite division as multiplication by the reciprocal');
};

export default divFractionsToReciprocal;
