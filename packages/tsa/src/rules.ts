import { R } from '@motor/core';
import type { AST, StepApplication } from './types';
import { add as addNode, div, literal, mul, sub as subNode } from './types';
import { reduceAndNormalize } from './reduce';

const BASE_RATIONALE = ['AST_PREORDER', 'ID_LEX'] as const;

type RuleHandler = (node: AST) => StepApplication | null;

const RULES: RuleHandler[] = [
  addFractionsToCommonDenominator,
  subFractionsToCommonDenominator,
  divFractionsToReciprocal,
  mulFractionsToSingle,
  addLiterals,
  subtractLiterals,
  multiplyLiterals,
  divideLiterals
];

export function applyNextRule(ast: AST): StepApplication | null {
  return applyRecursive(ast);
}

function applyRecursive(node: AST): StepApplication | null {
  for (const rule of RULES) {
    const result = rule(node);
    if (result) {
      return result;
    }
  }

  if (node.type === 'Add') {
    const left = applyRecursive(node.left);
    if (left) {
      return {
        ast: addNode(left.ast, node.right),
        rule: left.rule,
        rationale: left.rationale
      };
    }
    const right = applyRecursive(node.right);
    if (right) {
      return {
        ast: addNode(node.left, right.ast),
        rule: right.rule,
        rationale: right.rationale
      };
    }
  } else if (node.type === 'Sub') {
    const left = applyRecursive(node.left);
    if (left) {
      return {
        ast: subNode(left.ast, node.right),
        rule: left.rule,
        rationale: left.rationale
      };
    }
    const right = applyRecursive(node.right);
    if (right) {
      return {
        ast: subNode(node.left, right.ast),
        rule: right.rule,
        rationale: right.rationale
      };
    }
  }

  if (node.type === 'Mul') {
    const left = applyRecursive(node.left);
    if (left) {
      return {
        ast: mul(left.ast, node.right),
        rule: left.rule,
        rationale: left.rationale
      };
    }
    const right = applyRecursive(node.right);
    if (right) {
      return {
        ast: mul(node.left, right.ast),
        rule: right.rule,
        rationale: right.rationale
      };
    }
  } else if (node.type === 'Div') {
    const left = applyRecursive(node.left);
    if (left) {
      return {
        ast: div(left.ast, node.right),
        rule: left.rule,
        rationale: left.rationale
      };
    }
    const right = applyRecursive(node.right);
    if (right) {
      return {
        ast: div(node.left, right.ast),
        rule: right.rule,
        rationale: right.rationale
      };
    }
  }

  return null;
}

function rationale(rule: string): string[] {
  return [`PRIORITY:${rule}`, ...BASE_RATIONALE];
}

function addFractionsToCommonDenominator(node: AST): StepApplication | null {
  if (node.type !== 'Add') {
    return null;
  }
  if (node.left.type !== 'Div' || node.right.type !== 'Div') {
    return null;
  }

  return {
    ast: div(
      addNode(
        mul(node.left.left, node.right.right),
        mul(node.right.left, node.left.right)
      ),
      mul(node.left.right, node.right.right)
    ),
    rule: 'addFractionsToCommonDenominator',
    rationale: rationale('addFractionsToCommonDenominator')
  };
}

function subFractionsToCommonDenominator(node: AST): StepApplication | null {
  if (node.type !== 'Sub') {
    return null;
  }
  if (node.left.type !== 'Div' || node.right.type !== 'Div') {
    return null;
  }

  return {
    ast: div(
      subNode(
        mul(node.left.left, node.right.right),
        mul(node.right.left, node.left.right)
      ),
      mul(node.left.right, node.right.right)
    ),
    rule: 'subFractionsToCommonDenominator',
    rationale: rationale('subFractionsToCommonDenominator')
  };
}

function divFractionsToReciprocal(node: AST): StepApplication | null {
  if (node.type !== 'Div') {
    return null;
  }
  if (node.left.type !== 'Div' || node.right.type !== 'Div') {
    return null;
  }

  return {
    ast: mul(node.left, div(node.right.right, node.right.left)),
    rule: 'divFractionsToReciprocal',
    rationale: rationale('divFractionsToReciprocal')
  };
}

function mulFractionsToSingle(node: AST): StepApplication | null {
  if (node.type !== 'Mul') {
    return null;
  }
  if (node.left.type !== 'Div' || node.right.type !== 'Div') {
    return null;
  }

  return {
    ast: div(mul(node.left.left, node.right.left), mul(node.left.right, node.right.right)),
    rule: 'mulFractionsToSingle',
    rationale: rationale('mulFractionsToSingle')
  };
}

function addLiterals(node: AST): StepApplication | null {
  if (node.type !== 'Add') {
    return null;
  }
  if (node.left.type !== 'Literal' || node.right.type !== 'Literal') {
    return null;
  }
  const value = reduceAndNormalize(R.add(node.left.value, node.right.value));
  return {
    ast: literal(value),
    rule: 'addLiterals',
    rationale: rationale('addLiterals')
  };
}

function subtractLiterals(node: AST): StepApplication | null {
  if (node.type !== 'Sub') {
    return null;
  }
  if (node.left.type !== 'Literal' || node.right.type !== 'Literal') {
    return null;
  }
  const value = reduceAndNormalize(R.sub(node.left.value, node.right.value));
  return {
    ast: literal(value),
    rule: 'subtractLiterals',
    rationale: rationale('subtractLiterals')
  };
}

function multiplyLiterals(node: AST): StepApplication | null {
  if (node.type !== 'Mul') {
    return null;
  }
  if (node.left.type !== 'Literal' || node.right.type !== 'Literal') {
    return null;
  }
  const value = reduceAndNormalize(R.mul(node.left.value, node.right.value));
  return {
    ast: literal(value),
    rule: 'multiplyLiterals',
    rationale: rationale('multiplyLiterals')
  };
}

function divideLiterals(node: AST): StepApplication | null {
  if (node.type !== 'Div') {
    return null;
  }
  if (node.left.type !== 'Literal' || node.right.type !== 'Literal') {
    return null;
  }
  if (node.right.value.n === 0n) {
    return null;
  }
  const value = reduceAndNormalize(R.div(node.left.value, node.right.value));
  return {
    ast: literal(value),
    rule: 'divideLiterals',
    rationale: rationale('divideLiterals')
  };
}
