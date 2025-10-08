import { describe, it, expect } from 'vitest';
import { makeTypedMock } from './testUtils';
import { makeExecutor } from '../executor';
import type { NodeId, AST } from '../opTokens';

type ListActions = (focus: NodeId[]) => string[];
type CanApply = (rule: string, focus: NodeId[]) => boolean;
type OnExecute = (payload: { rule: string; focus: NodeId[] }) => void;

function makeAst(linear: NodeId[], text: Record<NodeId, string>): AST {
  return {
    linear,
    tokens: Object.fromEntries(
      Object.entries(text).map(([k, v]) => [k, { text: v }]),
    ),
  };
}

describe('TIL executor', () => {
  it('maps "+" to add and calls onExecute with [left, op, right]', () => {
    const ast = makeAst(['a', 'op', 'b'], { a: '2', op: '+', b: '3' });

    const { fn: listActions, mock: listActionsMock } = makeTypedMock<ListActions>(() => ['add', 'mul']);
    const { fn: canApply, mock: canApplyMock } = makeTypedMock<CanApply>(() => true);
    const { fn: onExecute, mock: onExecuteMock } = makeTypedMock<OnExecute>();

    const exec = makeExecutor(() => ast, { listActions, canApply, onExecute });
    exec(['op']);

    expect(onExecuteMock).toHaveBeenCalledTimes(1);
    const call = onExecuteMock.mock.calls[0][0];
    expect(call.rule).toBe('add');
    expect(call.focus).toEqual(['a', 'op', 'b']);
    expect(canApplyMock).toHaveBeenCalledWith('add', ['a', 'op', 'b']);
    expect(listActionsMock).toHaveBeenCalled();
  });

  it('falls back to first available rule if mapped rule is unavailable', () => {
    const ast = makeAst(['x', 'op', 'y'], { x: '2', op: '+', y: '3' });

    const { fn: listActions } = makeTypedMock<ListActions>(() => ['weirdRule']);
    const { fn: canApply } = makeTypedMock<CanApply>(() => true);
    const { fn: onExecute, mock: onExecuteMock } = makeTypedMock<OnExecute>();

    const exec = makeExecutor(() => ast, { listActions, canApply, onExecute });
    exec(['op']);

    expect(onExecuteMock).toHaveBeenCalledTimes(1);
    expect(onExecuteMock.mock.calls[0][0].rule).toBe('weirdRule');
  });

  it('returns early if canApply=false or no available rules', () => {
    const ast = makeAst(['l', 'op', 'r'], { l: '1', op: '+', r: '1' });

    const { fn: listActions } = makeTypedMock<ListActions>(() => []);
    const { fn: canApply } = makeTypedMock<CanApply>(() => false);
    const { fn: onExecute, mock: onExecuteMock } = makeTypedMock<OnExecute>();

    const exec = makeExecutor(() => ast, { listActions, canApply, onExecute });
    exec(['op']);

    expect(onExecuteMock).not.toHaveBeenCalled();
  });
});
