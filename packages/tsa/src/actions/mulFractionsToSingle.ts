import { getAtPath } from '@motor/ast';
import { asFraction, applyReplacement } from '../utils.js';
import type { StepFn } from '@motor/types';

const mulFractionsToSingle: StepFn = (expr, path) => {
  const node = getAtPath(expr, path);
  if (!node || node.type !== 'mul') return null;
  if (node.args.length < 2) return null;
  let num = 1n;
  let den = 1n;
  for (const term of node.args) {
    if (term.type !== 'rat') {
      return null;
    }
    num *= term.value.n;
    den *= term.value.d;
  }
  const fraction = asFraction(num, den);
  return applyReplacement(expr, path, fraction, 'Multiply fractions into a single numerator over denominator');
};

export default mulFractionsToSingle;
