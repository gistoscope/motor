export type { Result, Reason } from './result';
export { ok, fail } from './result';
export {
  divFractionsToReciprocal,
  mulFractionsToSingle,
  reduceFraction,
  normalizeSigns
} from './atoms/rational';
export type { FirstStepPlan } from './choose';
export { chooseFirstStep } from './choose';
