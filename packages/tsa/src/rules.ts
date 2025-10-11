import { R } from '@motor/core';
import type { AST, StepApplication } from './types.js';
import { add as addNode, div, literal, mul, sub as subNode } from './types.js';
import { reduceAndNormalize } from './reduce.js';

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

type StepWrapper = (application: StepApplication) => StepApplication;

export function listRuleApplications(ast: AST): StepApplication[] {
  const candidates: { depth: number; application: StepApplication }[] = [];
  let minDepth: number | null = null;

  const traverse = (node: AST, depth: number, wrap: StepWrapper): void => {
    for (const rule of RULES) {
      const result = rule(node);
      if (result) {
        const wrapped = wrap(result);
        candidates.push({ depth, application: wrapped });
        if (minDepth === null || depth < minDepth) {
          minDepth = depth;
        }
      }
    }

    switch (node.type) {
      case 'Literal':
        return;
      case 'Add':
      case 'Sub':
      case 'Mul':
      case 'Div':
        traverse(node.left, depth + 1, (childApplication) =>
          wrap({
            ast: rebuildWithChild(node, 'left', childApplication.ast),
            rule: childApplication.rule,
            rationale: childApplication.rationale
          })
        );
        traverse(node.right, depth + 1, (childApplication) =>
          wrap({
            ast: rebuildWithChild(node, 'right', childApplication.ast),
            rule: childApplication.rule,
            rationale: childApplication.rationale
          })
        );
        return;
      default:
        throw new Error(`UNHANDLED_AST_TYPE:${(node as { type: string }).type}`);
    }
  };

  traverse(ast, 0, (application) => application);

  if (minDepth === null) {
    return [];
  }

  return candidates
    .filter((candidate) => candidate.depth === minDepth)
    .map((candidate) => candidate.application);
}

export function applyNextRule(ast: AST): StepApplication | null {
  const [next] = listRuleApplications(ast);
  return next ?? null;
}

function rebuildWithChild(node: AST, side: 'left' | 'right', childAst: AST): AST {
  switch (node.type) {
    case 'Add':
      return side === 'left' ? addNode(childAst, node.right) : addNode(node.left, childAst);
    case 'Sub':
      return side === 'left' ? subNode(childAst, node.right) : subNode(node.left, childAst);
    case 'Mul':
      return side === 'left' ? mul(childAst, node.right) : mul(node.left, childAst);
    case 'Div':
      return side === 'left' ? div(childAst, node.right) : div(node.left, childAst);
    default:
      return node;
  }
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
