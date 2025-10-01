import { add, getAtPath, mul } from '@motor/ast';
import { asFraction, applyReplacement } from '../utils.js';
import type { StepFn } from '@motor/types';

const dropNeutral: StepFn = (expr, path) => {
  const node = getAtPath(expr, path);
  if (!node) return null;
  if (node.type === 'add') {
    const filtered = node.args.filter(term => !(term.type === 'rat' && term.value.n === 0n));
    if (filtered.length === node.args.length) return null;
    const replacement = filtered.length === 0
      ? asFraction(0n, 1n)
      : filtered.length === 1
        ? filtered[0]
        : add(...filtered);
    return applyReplacement(expr, path, replacement, 'Remove zero terms from the sum');
  }
  if (node.type === 'mul') {
    const filtered = node.args.filter(term => !(term.type === 'rat' && term.value.n === 1n && term.value.d === 1n));
    if (filtered.length === node.args.length) return null;
    const replacement = filtered.length === 0
      ? asFraction(1n, 1n)
      : filtered.length === 1
        ? filtered[0]
        : mul(...filtered);
    return applyReplacement(expr, path, replacement, 'Remove multiplicative identity terms');
  }
  return null;
};

export default dropNeutral;
