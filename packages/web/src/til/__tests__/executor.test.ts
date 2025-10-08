import { describe, expect, it, vi } from 'vitest';

import { makeExecutor } from '../executor';
import { AST, NodeId, TILExecuteOptions } from '../types';

type TestAst = {
  nodes: Record<NodeId, { text: string; prev?: NodeId; next?: NodeId }>;
};

function createAst(operator: string): AST {
  const ast: TestAst = {
    nodes: {
      left: { text: '1', next: 'op' },
      op: { text: operator, prev: 'left', next: 'right' },
      right: { text: '2', prev: 'op' },
    },
  };

  return ast;
}

describe('makeExecutor', () => {
  const operatorRules: Record<string, string> = {
    '+': 'add',
    '-': 'sub',
    '*': 'mul',
    '/': 'div',
    '^': 'pow',
  };

  for (const [symbol, rule] of Object.entries(operatorRules)) {
    it(`executes rule for ${symbol}`, () => {
      const ast = createAst(symbol);
      const getAst = vi.fn<[], AST>(() => ast);
      const listActions = vi.fn<[NodeId[]], string[]>(() => ['noop', rule, 'other']);
      const canApply = vi.fn<[string, NodeId[]], boolean>(() => true);
      const onExecute = vi.fn<[ { rule: string; focus: NodeId[] } ], void>();

      const options: TILExecuteOptions = {
        listActions,
        canApply,
        onExecute,
      };

      const executor = makeExecutor(getAst, options);
      executor(['op']);

      const expectedFocus: NodeId[] = ['left', 'op', 'right'];
      expect(listActions).toHaveBeenCalledWith(expectedFocus);
      expect(canApply).toHaveBeenCalledWith(rule, expectedFocus);
      expect(onExecute).toHaveBeenCalledWith({ rule, focus: expectedFocus });
    });
  }

  it('ignores when no matching rule', () => {
    const ast = createAst('+');
    const getAst = vi.fn<[], AST>(() => ast);
    const listActions = vi.fn<[NodeId[]], string[]>(() => ['noop']);
    const canApply = vi.fn<[string, NodeId[]], boolean>(() => true);
    const onExecute = vi.fn();

    const options: TILExecuteOptions = {
      listActions,
      canApply,
      onExecute,
    };

    const executor = makeExecutor(getAst, options);
    executor(['op']);

    expect(onExecute).not.toHaveBeenCalled();
    expect(canApply).not.toHaveBeenCalled();
  });

  it('ignores when rule cannot apply', () => {
    const ast = createAst('+');
    const getAst = vi.fn<[], AST>(() => ast);
    const listActions = vi.fn<[NodeId[]], string[]>(() => ['add']);
    const canApply = vi.fn<[string, NodeId[]], boolean>(() => false);
    const onExecute = vi.fn();

    const options: TILExecuteOptions = {
      listActions,
      canApply,
      onExecute,
    };

    const executor = makeExecutor(getAst, options);
    executor(['op']);

    expect(onExecute).not.toHaveBeenCalled();
    expect(canApply).toHaveBeenCalledWith('add', ['left', 'op', 'right']);
  });
});
