import { describe, it, expect } from 'vitest';
import { microApplyOne } from '../microExecute';
import type { AST } from '../opTokens';

describe('microApplyOne', () => {
  const ast: AST = {
    linear: ['open', 'two', 'plusInner', 'three', 'close', 'plusOuter', 'four'],
    tokens: {
      open: { text: '(' },
      two: { text: '2' },
      plusInner: { text: '+' },
      three: { text: '3' },
      close: { text: ')' },
      plusOuter: { text: '+' },
      four: { text: '4' }
    },
    nodes: {
      'inner.op': { span: ['two', 'plusInner', 'three'], type: 'Operation' },
      'paren.group': {
        span: ['open', 'two', 'plusInner', 'three', 'close'],
        type: 'Paren'
      },
      'outer.op': {
        span: ['open', 'two', 'plusInner', 'three', 'close', 'plusOuter', 'four'],
        type: 'Operation'
      }
    }
  };

  it('computes simple literal addition inside parentheses', () => {
    const result = microApplyOne(' (2+3)+4 ', ast, ['plusInner']);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.expr).toBe('5+4');
    }
  });

  it('returns ok:false when micro execution is not possible', () => {
    const result = microApplyOne('(2+3)+4', ast, ['plusOuter']);
    expect(result.ok).toBe(false);
  });

  it('computes rational addition for simple fractions', () => {
    const fractionAst: AST = {
      linear: ['oneA', 'slashA', 'two', 'plus', 'oneB', 'slashB', 'three'],
      tokens: {
        oneA: { text: '1' },
        slashA: { text: '/' },
        two: { text: '2' },
        plus: { text: '+' },
        oneB: { text: '1' },
        slashB: { text: '/' },
        three: { text: '3' }
      },
      nodes: {
        'left.frac': { span: ['oneA', 'slashA', 'two'], type: 'Fraction' },
        'right.frac': { span: ['oneB', 'slashB', 'three'], type: 'Fraction' },
        'add.op': {
          span: ['oneA', 'slashA', 'two', 'plus', 'oneB', 'slashB', 'three'],
          type: 'Operation'
        }
      }
    };

    const result = microApplyOne('1/2 + 1/3', fractionAst, ['plus']);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.expr).toBe('5/6');
    }
  });
});
