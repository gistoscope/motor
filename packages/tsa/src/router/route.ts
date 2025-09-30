import type { ActionRegistry, StepFn } from '@motor/types';
import * as actions from '../actions/index.js';

const registry: ActionRegistry = {
  decimalToFractionMinimal: actions.decimalToFractionMinimal,
  expandMixedToSum: actions.expandMixedToSum,
  integerToOverOneOnOperatorClick: actions.integerToOverOneOnOperatorClick,
  divFractionsToReciprocal: actions.divFractionsToReciprocal,
  mulFractionsToSingle: actions.mulFractionsToSingle,
  factorizeFractionSides: actions.factorizeFractionSides,
  factorizeDenominatorsForAddSub: actions.factorizeDenominatorsForAddSub,
  normalizeSign: actions.normalizeSign,
  dropNeutral: actions.dropNeutral,
  flattenParens: actions.flattenParens
};

export const route = (id: string): StepFn | undefined => registry[id];

export const availableActions = (): readonly string[] => Object.keys(registry);
