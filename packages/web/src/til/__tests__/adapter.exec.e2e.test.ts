/* @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { makeExecutor } from '../../til/executor';
import * as adapter from '../../til/tsaAdapter';

type AST = any; type NodeId = string;

function makeAst(ids: NodeId[], text: Record<NodeId,string>): AST {
  return { linear: ids, tokens: Object.fromEntries(Object.entries(text).map(([k,v]) => [k, { text: v }])) };
}

describe('TIL exec → TSA bridge (smoke)', () => {
  it('executes mapped rule on "+" focus', () => {
    const ast = makeAst(['a','op','b'], { a:'2', op:'+', b:'3' });
    const getAst = () => ast;

    const la = vi.spyOn(adapter, 'listActions').mockReturnValue(['add']);
    const ca = vi.spyOn(adapter, 'canApply').mockReturnValue(true);
    const ap = vi.spyOn(adapter, 'applyOne').mockReturnValue({ ok: true, ast });

    const exec = makeExecutor(getAst, {
      listActions: (focus) => adapter.listActions(ast, focus),
      canApply: (rule, focus) => adapter.canApply(ast, rule, focus),
      onExecute: ({ rule, focus }) => { adapter.applyOne(ast, rule, focus); }
    });

    exec(['op']);
    expect(la).toHaveBeenCalled();
    expect(ca).toHaveBeenCalledWith(ast, 'add', ['a','op','b']);
    expect(ap).toHaveBeenCalledWith(ast, 'add', ['a','op','b']);
  });
});
