import { describe, expect, it } from 'vitest';
import {
  applyNextRule,
  evaluateExpression,
  formatRational,
  formatStage2,
  listRuleApplications,
  parseStage2Expression
} from '../src';

function collectRules(source: string): { finalExpr: string; rules: string[]; rational: string } {
  let ast = parseStage2Expression(source);
  const rules: string[] = [];
  while (true) {
    const next = applyNextRule(ast);
    if (!next) {
      break;
    }
    rules.push(next.rule);
    ast = next.ast;
  }
  const evaluated = evaluateExpression(ast);
  if ('error' in evaluated) {
    throw new Error(`Evaluation failed: ${evaluated.error}`);
  }
  return {
    finalExpr: formatStage2(ast),
    rules,
    rational: formatRational(evaluated)
  };
}

describe('Stage2 TSA pipeline', () => {
  it('parses and formats addition/subtraction expressions', () => {
    const addAst = parseStage2Expression('((2/3) + (5/7))');
    expect(formatStage2(addAst)).toBe('((2/3) + (5/7))');

    const subAst = parseStage2Expression('((2/3) - (5/7))');
    expect(formatStage2(subAst)).toBe('((2/3) - (5/7))');
  });

  it('performs a full rational reduction trace for addition', () => {
    const { finalExpr, rules, rational } = collectRules('((2/3) + (5/7))');
    expect(rules).toEqual([
      'addFractionsToCommonDenominator',
      'multiplyLiterals',
      'multiplyLiterals',
      'addLiterals',
      'multiplyLiterals',
      'divideLiterals'
    ]);
    expect(finalExpr).toBe('(29/21)');
    expect(rational).toBe('29/21');
  });

  it('performs a full rational reduction trace for subtraction', () => {
    const { finalExpr, rules, rational } = collectRules('((2/3) - (5/7))');
    expect(rules).toEqual([
      'subFractionsToCommonDenominator',
      'multiplyLiterals',
      'multiplyLiterals',
      'subtractLiterals',
      'multiplyLiterals',
      'divideLiterals'
    ]);
    expect(finalExpr).toBe('(-1/21)');
    expect(rational).toBe('-1/21');
  });

  it('reduces mixed sign arithmetic', () => {
    const ast = parseStage2Expression('(-2) - (-3)');
    const result = collectRules('(-2) - (-3)');
    expect(result.finalExpr).toBe('1');
    expect(result.rational).toBe('1');

    const evaluated = evaluateExpression(ast);
    if ('error' in evaluated) {
      throw new Error('Expected evaluation to succeed');
    }
    expect(formatRational(evaluated)).toBe('1');
  });

  it('enumerates applicable rules in pre-order traversal', () => {
    const ast = parseStage2Expression('((2/3) ÷ (5/7))');
    const options = listRuleApplications(ast);
    expect(options.map((option) => option.rule)).toEqual(['divFractionsToReciprocal']);
  });

  it('enumerates nested rule candidates', () => {
    const ast = parseStage2Expression('((2/3) + (5/7))');
    const rules = listRuleApplications(ast).map((option) => option.rule);
    expect(rules[0]).toBe('addFractionsToCommonDenominator');
    expect(rules).toContain('multiplyLiterals');
  });
});
