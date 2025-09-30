import { getAtPath } from '@motor/ast';
import { asFraction, applyReplacement } from '../utils.js';
import type { StepFn } from '@motor/types';

const normalizeSign: StepFn = (expr, path) => {
  const node = getAtPath(expr, path);
  if (!node || node.type !== 'rat') return null;
  if (node.value.d > 0n) return null;
  return applyReplacement(expr, path, asFraction(-node.value.n, -node.value.d), 'Move the negative sign to the numerator');
};

export default normalizeSign;
