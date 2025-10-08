import type { AST, NodeId } from './opTokens';
import { isOperatorChar, getTokenText, getNeighbors } from './opTokens';

export type TILExecuteOptions = {
  listActions: (focus: NodeId[]) => string[];
  canApply: (rule: string, focus: NodeId[]) => boolean;
  onExecute?: (payload: { rule: string; focus: NodeId[] }) => void;
  opRuleMap?: Partial<Record<string, string>>;
};

const DEFAULT_MAP: Record<string, string> = {
  '+': 'add',
  '-': 'sub',
  '*': 'mul',
  '/': 'div',
  '^': 'pow',
};

export function makeExecutor(getAst: () => AST, opts: TILExecuteOptions) {
  const map = { ...DEFAULT_MAP, ...(opts.opRuleMap ?? {}) };

  return function exec(focus: NodeId[]) {
    if (!focus?.length) return;

    const ast = getAst();
    const opId = focus.find((id) => isOperatorChar(getTokenText(ast, id)));
    if (!opId) return;

    const ch = getTokenText(ast, opId);
    const mappedRule = map[ch];

    let normalized = focus;
    const { left, right } = getNeighbors(ast, opId);
    if (left && right) {
      normalized = [left, opId, right];
    }

    const available = opts.listActions(normalized);
    if (!available.length) return;

    const rule = mappedRule && available.includes(mappedRule) ? mappedRule : available[0];
    if (!rule) return;

    if (!opts.canApply(rule, normalized)) return;
    opts.onExecute?.({ rule, focus: normalized });
  };
}
