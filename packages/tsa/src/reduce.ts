import { R } from '@motor/core';
import type { Rational } from './types.js';

export function reduceAndNormalize(r: Rational): Rational {
  return R.make(r.n, r.d);
}
