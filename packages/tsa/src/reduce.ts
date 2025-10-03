import { R } from '@motor/core';
import type { Rational } from '@motor/core';

export function reduceAndNormalize(r: Rational): Rational {
  return R.make(r.n, r.d);
}
