import { Result, ok, fail } from './result';
import { divFractionsToReciprocal, mulFractionsToSingle, reduceFraction, normalizeSigns } from './atoms/rational';

export interface FirstStepPlan {
  id: string;
  rationale: string[];
}

type AtomEntry = {
  id: string;
  apply: (expr: string) => Result<{ expr: string }>;
};

const ATOM_PRIORITY: AtomEntry[] = [
  { id: 'divFractionsToReciprocal', apply: divFractionsToReciprocal },
  { id: 'mulFractionsToSingle', apply: mulFractionsToSingle },
  { id: 'reduceFraction', apply: reduceFraction },
  { id: 'normalizeSigns', apply: normalizeSigns }
];

export function chooseFirstStep(expr: string): Result<FirstStepPlan> {
  const trimmed = expr.trim();

  for (const atom of ATOM_PRIORITY) {
    const result = atom.apply(trimmed);
    if (result.ok) {
      return ok({
        id: atom.id,
        rationale: [`PRIORITY:${atom.id}`, 'AST_PREORDER', 'ID_LEX']
      });
    }
  }

  return fail();
}
