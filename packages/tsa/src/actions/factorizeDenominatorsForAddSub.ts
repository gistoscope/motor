import { add, div, getAtPath } from '@motor/ast';
import { applyReplacement } from '../utils.js';
import type { StepFn } from '@motor/types';

const factorizeDenominatorsForAddSub: StepFn = (expr, path) => {
  const node = getAtPath(expr, path);
  if (!node || node.type !== 'div') return null;
  const numerator = node.left;
  if (numerator.type !== 'add') return null;
  const distributed = add(
    ...numerator.args.map(term => div(term, node.right))
  );
  return applyReplacement(expr, path, distributed, 'Distribute the denominator across the sum');
};

export default factorizeDenominatorsForAddSub;
