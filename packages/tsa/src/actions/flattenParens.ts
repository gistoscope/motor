import { add, getAtPath, mul } from '@motor/ast';
import { applyReplacement } from '../utils.js';
import type { StepFn } from '@motor/types';

const flattenParens: StepFn = (expr, path) => {
  const node = getAtPath(expr, path);
  if (!node) return null;
  if (node.type !== 'add' && node.type !== 'mul') return null;
  const flattened = node.args.flatMap(term => term.type === node.type ? term.args : [term]);
  if (flattened.length === node.args.length) return null;
  const replacement = node.type === 'add' ? add(...flattened) : mul(...flattened);
  return applyReplacement(expr, path, replacement, 'Flatten nested groupings');
};

export default flattenParens;
