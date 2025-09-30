import { div, getAtPath } from '@motor/ast';
import { asFraction, applyReplacement } from '../utils.js';
import type { StepFn } from '@motor/types';

const integerToOverOneOnOperatorClick: StepFn = (expr, path) => {
  const node = getAtPath(expr, path);
  if (!node || node.type !== 'rat') return null;
  if (node.value.d !== 1n) return null;
  const replacement = div(asFraction(node.value.n, 1n), asFraction(1n, 1n));
  return applyReplacement(expr, path, replacement, 'Represent whole number as a fraction over one');
};

export default integerToOverOneOnOperatorClick;
