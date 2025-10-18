// @ts-nocheck
import { describe, expect, it } from 'vitest';

import { astToGraph } from '../../web/src/math/ast2graph';

describe('math ast-to-graph conversion', () => {
  it('converts structured AST into deterministic GraphJSON', () => {
    const ast = {
      linear: ['left.token', 'op.token', 'right.token'],
      tokens: {
        'left.token': { text: '2' },
        'op.token': { text: '+' },
        'right.token': { text: '3' },
      },
      nodes: {
        expr: { span: ['left.token', 'op.token', 'right.token'], type: 'Add' },
        left: { span: ['left.token'], type: 'Number' },
        right: { span: ['right.token'], type: 'Number' },
      },
      owner: {
        'left.token': 'left',
        'op.token': 'expr',
        'right.token': 'right',
      },
      parent: {
        expr: null,
        left: 'expr',
        right: 'expr',
        'left.token': 'left',
        'op.token': 'expr',
        'right.token': 'right',
      },
      pairs: {
        pair: ['left.token', 'right.token'],
      },
    };

    const result = astToGraph(ast);

    expect(result.graph).toEqual({
      nodes: [
        { id: 'expr', label: 'Add' },
        { id: 'left', label: 'Number' },
        { id: 'left.token', label: '2' },
        { id: 'op.token', label: '+' },
        { id: 'pair', label: 'pair' },
        { id: 'right', label: 'Number' },
        { id: 'right.token', label: '3' },
      ],
      edges: [
        { from: 'expr', to: 'left' },
        { from: 'expr', to: 'op.token' },
        { from: 'expr', to: 'right' },
        { from: 'left', to: 'left.token' },
        { from: 'right', to: 'right.token' },
      ],
    });

    expect(result.nodeTokens).toEqual({
      expr: ['left.token', 'op.token', 'right.token'],
      left: ['left.token'],
      'left.token': ['left.token'],
      'op.token': ['op.token'],
      pair: ['left.token', 'right.token'],
      right: ['right.token'],
      'right.token': ['right.token'],
    });

    expect(result.tokenNodes).toEqual({
      'left.token': ['expr', 'left', 'left.token', 'pair'],
      'op.token': ['expr', 'op.token'],
      'right.token': ['expr', 'pair', 'right', 'right.token'],
    });

    expect(result.roots).toEqual(['expr', 'pair']);
  });

  it('returns an empty graph for non-object inputs', () => {
    const result = astToGraph(undefined);
    expect(result.graph).toEqual({ nodes: [], edges: [] });
    expect(result.nodeTokens).toEqual({});
    expect(result.tokenNodes).toEqual({});
    expect(result.roots).toEqual([]);
  });
});
