import { getNeighbors, getTokenText, isOperatorChar } from './astNavigator';
import { AST, NodeId, TILExecuteOptions } from './types';

const OPERATOR_RULE_MAP: Record<string, string> = {
  '+': 'add',
  '-': 'sub',
  '*': 'mul',
  '/': 'div',
  '^': 'pow',
};

function normalizeOperatorChar(text: string | undefined): string | undefined {
  if (!text) {
    return undefined;
  }

  const trimmed = text.trim();
  if (trimmed.length !== 1) {
    return undefined;
  }

  return trimmed;
}

function findOperatorId(ast: AST, focus: NodeId[]): NodeId | undefined {
  for (const id of focus) {
    const token = normalizeOperatorChar(getTokenText(ast, id));
    if (token && isOperatorChar(token)) {
      return id;
    }
  }

  return undefined;
}

export function makeExecutor(getAst: () => AST, opts: TILExecuteOptions): (focus: NodeId[]) => void {
  return (selection: NodeId[]) => {
    if (!Array.isArray(selection) || selection.length === 0) {
      return;
    }

    const ast = getAst();
    const operatorId = findOperatorId(ast, selection);
    if (!operatorId) {
      return;
    }

    const operatorChar = normalizeOperatorChar(getTokenText(ast, operatorId));
    if (!operatorChar || !isOperatorChar(operatorChar)) {
      return;
    }

    const rule = OPERATOR_RULE_MAP[operatorChar];
    if (!rule) {
      return;
    }

    const neighbors = getNeighbors(ast, operatorId);
    let focus = [...selection];
    if (neighbors.left && neighbors.right) {
      focus = [neighbors.left, operatorId, neighbors.right];
    }

    const actions = opts.listActions(focus);
    const matchingRule = actions.find((action) => action === rule);
    if (!matchingRule) {
      return;
    }

    if (!opts.canApply(matchingRule, focus)) {
      return;
    }

    opts.onExecute?.({ rule: matchingRule, focus });
  };
}
