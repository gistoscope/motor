import { describe, it, expect } from 'vitest';
import {
  applyNextRule,
  evaluateExpression,
  formatRational,
  listRuleApplications,
  reduceAndNormalize
} from '../src/index.js';
import { add, sub, mul, div, literal, type AST } from '../src/types.js';
import { R } from '@motor/core';

const makeLiteral = (n: bigint, d: bigint) => literal(R.make(n, d));

const mustEvaluate = (ast: AST) => {
  const result = evaluateExpression(ast);
  if ('error' in result) {
    throw new Error(`Expected evaluation to succeed, received ${result.error}`);
  }
  return result;
};

describe('@motor/tsa rule contracts', () => {
  it('addFractionsToCommonDenominator merges denominators when both sides are fractions', () => {
    const left = div(makeLiteral(1n, 2n), makeLiteral(3n, 5n));
    const right = div(makeLiteral(2n, 5n), makeLiteral(4n, 7n));
    const ast = add(left, right);

    const applications = listRuleApplications(ast);
    const step = applications.find((candidate) => candidate.rule === 'addFractionsToCommonDenominator');
    expect(step).toBeDefined();
    expect(step?.rationale[0]).toBe('PRIORITY:addFractionsToCommonDenominator');

    const transformed = step!.ast;
    expect(transformed.type).toBe('Div');

    const before = formatRational(mustEvaluate(ast));
    const after = formatRational(mustEvaluate(transformed));
    expect(before).toBe(after);

    const noopAst = add(makeLiteral(1n, 2n), makeLiteral(1n, 3n));
    const noopRules = listRuleApplications(noopAst).map((entry) => entry.rule);
    expect(noopRules).not.toContain('addFractionsToCommonDenominator');
  });

  it('subFractionsToCommonDenominator subtracts with shared denominator', () => {
    const left = div(makeLiteral(5n, 7n), makeLiteral(3n, 5n));
    const right = div(makeLiteral(1n, 2n), makeLiteral(4n, 9n));
    const ast = sub(left, right);

    const step = listRuleApplications(ast).find((candidate) => candidate.rule === 'subFractionsToCommonDenominator');
    expect(step).toBeDefined();
    const transformed = step!.ast;
    expect(transformed.type).toBe('Div');

    const before = mustEvaluate(ast);
    const after = mustEvaluate(transformed);
    expect(formatRational(before)).toBe(formatRational(after));

    const noopAst = sub(makeLiteral(3n, 4n), makeLiteral(1n, 5n));
    const noopRules = listRuleApplications(noopAst).map((entry) => entry.rule);
    expect(noopRules).not.toContain('subFractionsToCommonDenominator');
  });

  it('divFractionsToReciprocal multiplies by reciprocal of the divisor', () => {
    const dividend = div(makeLiteral(3n, 5n), makeLiteral(2n, 7n));
    const divisor = div(makeLiteral(4n, 9n), makeLiteral(1n, 3n));
    const ast = div(dividend, divisor);

    const step = listRuleApplications(ast).find((candidate) => candidate.rule === 'divFractionsToReciprocal');
    expect(step).toBeDefined();
    expect(step!.ast.type).toBe('Mul');

    const before = mustEvaluate(ast);
    const after = mustEvaluate(step!.ast);
    expect(formatRational(before)).toBe(formatRational(after));

    const noopAst = div(makeLiteral(1n, 2n), makeLiteral(3n, 4n));
    const noopRules = listRuleApplications(noopAst).map((entry) => entry.rule);
    expect(noopRules).not.toContain('divFractionsToReciprocal');
  });

  it('mulFractionsToSingle collapses fractional multiplication to one fraction', () => {
    const left = div(makeLiteral(1n, 2n), makeLiteral(3n, 5n));
    const right = div(makeLiteral(5n, 6n), makeLiteral(7n, 8n));
    const ast = mul(left, right);

    const step = listRuleApplications(ast).find((candidate) => candidate.rule === 'mulFractionsToSingle');
    expect(step).toBeDefined();
    expect(step!.ast.type).toBe('Div');

    const before = mustEvaluate(ast);
    const after = mustEvaluate(step!.ast);
    expect(formatRational(before)).toBe(formatRational(after));

    const noopAst = mul(makeLiteral(1n, 2n), makeLiteral(3n, 4n));
    const noopRules = listRuleApplications(noopAst).map((entry) => entry.rule);
    expect(noopRules).not.toContain('mulFractionsToSingle');
  });

  it('literal arithmetic rules reduce to a single normalized literal', () => {
    const literals = {
      add: add(makeLiteral(1n, 3n), makeLiteral(1n, 6n)),
      sub: sub(makeLiteral(5n, 6n), makeLiteral(1n, 2n)),
      mul: mul(makeLiteral(-2n, 3n), makeLiteral(3n, 4n)),
      div: div(makeLiteral(5n, 6n), makeLiteral(-7n, 9n))
    } as const;

    const expectations: Record<string, string> = {};

    for (const [rule, ast] of Object.entries(literals)) {
      const application = listRuleApplications(ast).find((candidate) => candidate.rule === `${rule}Literals`);
      expect(application).toBeDefined();
      expect(application!.ast.type).toBe('Literal');

      const reduced = reduceAndNormalize(mustEvaluate(ast));
      expect(formatRational(reduced)).toBe(formatRational(mustEvaluate(application!.ast)));
      expectations[rule] = `${reduced.n.toString()}/${reduced.d.toString()}`;
    }

    const zeroDivisor = div(makeLiteral(1n, 2n), makeLiteral(0n, 1n));
    const zeroRules = listRuleApplications(zeroDivisor).map((entry) => entry.rule);
    expect(zeroRules).not.toContain('divideLiterals');

    expect(expectations.add).toBe('1/2');
    expect(expectations.sub).toBe('2/3');
    expect(expectations.mul).toBe('-1/2');
    expect(expectations.div).toBe('-15/14');
  });

  it('applyNextRule returns null when no rules are applicable', () => {
    const ast = add(makeLiteral(1n, 2n), makeLiteral(3n, 4n));
    expect(applyNextRule(ast)).toBeNull();
  });
});
