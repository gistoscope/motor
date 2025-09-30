import { getAtPath } from '@motor/ast';
import { asFraction, applyReplacement, reduce } from '../utils.js';
import type { StepFn } from '@motor/types';

const decimalToFractionMinimal: StepFn = (expr, path) => {
  const node = getAtPath(expr, path);
  if (!node || node.type !== 'rat') return null;
  const { n, d } = node.value;
  const reduced = reduce(n, d);
  if (reduced.n === n && reduced.d === d) {
    return null;
  }
  return applyReplacement(expr, path, asFraction(reduced.n, reduced.d), 'Reduce fraction to lowest terms');
};

export default decimalToFractionMinimal;
