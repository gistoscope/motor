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
  const options = listRuleApplications(ast);
  return options.length > 0 ? options[0] ?? null : null;
}

export function listRuleApplications(ast: AST): StepApplication[] {
  return collectApplications(ast);
}

function collectApplications(node: AST): StepApplication[] {
  const collected: StepApplication[] = [];

  for (const rule of RULES) {
    const result = rule(node);
    if (result) {
      collected.push(result);
    }
  }

  if (node.type === 'Add') {
    for (const option of collectApplications(node.left)) {
      collected.push({
        ast: addNode(option.ast, node.right),
        rule: option.rule,
        rationale: option.rationale
      });
    }
    for (const option of collectApplications(node.right)) {
      collected.push({
        ast: addNode(node.left, option.ast),
        rule: option.rule,
        rationale: option.rationale
      });
    }
  } else if (node.type === 'Sub') {
    for (const option of collectApplications(node.left)) {
      collected.push({
        ast: subNode(option.ast, node.right),
        rule: option.rule,
        rationale: option.rationale
      });
    }
    for (const option of collectApplications(node.right)) {
      collected.push({
        ast: subNode(node.left, option.ast),
        rule: option.rule,
        rationale: option.rationale
      });
    }
  } else if (node.type === 'Mul') {
    for (const option of collectApplications(node.left)) {
      collected.push({
        ast: mul(option.ast, node.right),
        rule: option.rule,
        rationale: option.rationale
      });
    }
    for (const option of collectApplications(node.right)) {
      collected.push({
        ast: mul(node.left, option.ast),
        rule: option.rule,
        rationale: option.rationale
      });
    }
  } else if (node.type === 'Div') {
    for (const option of collectApplications(node.left)) {
      collected.push({
        ast: div(option.ast, node.right),
        rule: option.rule,
        rationale: option.rationale
      });
    }
    for (const option of collectApplications(node.right)) {
      collected.push({
        ast: div(node.left, option.ast),
        rule: option.rule,
        rationale: option.rationale
      });
    }
  }

  return collected;
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
