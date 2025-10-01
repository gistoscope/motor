import { add, getAtPath } from '@motor/ast';
import { asFraction, applyReplacement } from '../utils.js';
import type { StepFn } from '@motor/types';

const expandMixedToSum: StepFn = (expr, path) => {
  const node = getAtPath(expr, path);
  if (!node || node.type !== 'rat') return null;
  const { n, d } = node.value;
  if (d === 0n) return null;
  const whole = n / d;
  const remainder = n - whole * d;
  if (remainder === 0n || (whole === 0n && (n === remainder))) {
    return null;
  }
  const expanded = add(asFraction(whole, 1n), asFraction(remainder, d));
  return applyReplacement(expr, path, expanded, 'Expand improper fraction into sum of whole and remainder');
};

export default expandMixedToSum;
