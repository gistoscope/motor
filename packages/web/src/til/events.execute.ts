import { getNeighbors, getTokenText, isOperatorChar } from './astNavigator';
import { AST, NodeId } from './types';

type ExecuteAPI = {
  getSelection(): NodeId[];
  setSelection(ids: NodeId[]): void;
  exec: (focus: NodeId[]) => void;
  getAst(): AST;
};

const AST_ATTRIBUTE = 'data-ast-id';

function getNodeIdFromEventTarget(target: EventTarget | null): NodeId | null {
  if (!(target instanceof Element)) {
    return null;
  }

  const element = target.closest(`[${AST_ATTRIBUTE}]`);
  if (!element) {
    return null;
  }

  const value = element.getAttribute(AST_ATTRIBUTE);
  return value ?? null;
}

function buildFocus(ast: AST, id: NodeId): NodeId[] {
  const neighbors = getNeighbors(ast, id);
  if (neighbors.left && neighbors.right) {
    return [neighbors.left, id, neighbors.right];
  }

  return [id];
}

export function wireExecuteShortcuts(root: HTMLElement, api: ExecuteAPI): () => void {
  const handleDoubleClick = (event: MouseEvent) => {
    const id = getNodeIdFromEventTarget(event.target);
    if (!id) {
      return;
    }

    const ast = api.getAst();
    const token = getTokenText(ast, id);
    const operator = token?.trim();
    if (!operator || operator.length !== 1 || !isOperatorChar(operator)) {
      return;
    }

    const focus = buildFocus(ast, id);
    api.setSelection([...focus]);
    api.exec(focus);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Enter') {
      return;
    }

    const selection = api.getSelection();
    if (!selection.length) {
      return;
    }

    api.exec([...selection]);
  };

  root.addEventListener('dblclick', handleDoubleClick);
  root.addEventListener('keydown', handleKeyDown);

  return () => {
    root.removeEventListener('dblclick', handleDoubleClick);
    root.removeEventListener('keydown', handleKeyDown);
  };
}
