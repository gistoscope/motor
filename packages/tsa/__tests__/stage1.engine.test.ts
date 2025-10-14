import { describe, expect, it } from 'vitest';
import {
  applyNextRule,
  evaluateExpression,
  formatRational,
  formatStage1,
  parseStage1Expression,
  reduceAndNormalize
} from '../src/index.js';

function collectRules(source: string): { finalExpr: string; rules: string[]; rational: string } {
  let ast = parseStage1Expression(source);
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
    finalExpr: formatStage1(ast),
    rules,
    rational: formatRational(evaluated)
  };
}

describe('Stage1 TSA pipeline', () => {
  it('parses and formats canonical expressions', () => {
    const ast = parseStage1Expression('((2/3) ÷ (5/7))');
    expect(formatStage1(ast)).toBe('((2/3) ÷ (5/7))');
  });

  it('performs a full rational reduction trace', () => {
    const { finalExpr, rules, rational } = collectRules('((2/3) ÷ (5/7))');
    expect(rules).toEqual([
      'divFractionsToReciprocal',
      'mulFractionsToSingle',
      'multiplyLiterals',
      'multiplyLiterals',
      'divideLiterals'
    ]);
    expect(finalExpr).toBe('(14/15)');
    expect(rational).toBe('14/15');
  });

  it('normalizes signed results', () => {
    const ast = parseStage1Expression('(-2)/(-3)');
    const outcome = collectRules('(-2)/(-3)');
    expect(outcome.rules).toEqual(['divideLiterals']);
    expect(outcome.finalExpr).toBe('(2/3)');
    expect(outcome.rational).toBe('2/3');

    const evaluated = evaluateExpression(ast);
    if ('error' in evaluated) {
      throw new Error('Expected evaluation to succeed');
    }
    const normalized = reduceAndNormalize(evaluated);
    expect(normalized.d > 0n).toBe(true);
  });

  it('surfaces division by zero errors', () => {
    const ast = parseStage1Expression('(1/0)');
    const result = evaluateExpression(ast);
    expect(result).toEqual({ error: 'DIVISION_BY_ZERO' });
  });
});
