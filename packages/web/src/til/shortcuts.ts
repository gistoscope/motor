import type { AST, NodeId } from './opTokens';
import { isOperatorChar, getTokenText, getNeighbors } from './opTokens';

export function wireExecuteShortcuts(
  root: HTMLElement,
  api: {
    getAst(): AST;
    getSelection(): NodeId[];
    setSelection(ids: NodeId[]): void;
    exec: (focus: NodeId[]) => void;
  },
): () => void {
  const onDblClick = (event: MouseEvent) => {
    const target = event.target as Element | null;
    const el = target?.closest?.('[data-ast-id]') as HTMLElement | null;
    if (!el) return;

    const id = el.getAttribute('data-ast-id') as NodeId | null;
    if (!id) return;

    const ast = api.getAst();
    const token = getTokenText(ast, id);
    if (!isOperatorChar(token)) return;

    const { left, right } = getNeighbors(ast, id);
    const focus = left && right ? [left, id, right] : [id];

    api.setSelection(focus);
    api.exec(focus);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Enter') return;

    const selection = api.getSelection();
    if (!selection?.length) return;

    const ast = api.getAst();
    const hasOperator = selection.some((id) => isOperatorChar(getTokenText(ast, id)));
    if (!hasOperator) return;

    api.exec(selection);
  };

  root.addEventListener('dblclick', onDblClick);
  root.addEventListener('keydown', onKeyDown);

  return () => {
    root.removeEventListener('dblclick', onDblClick);
    root.removeEventListener('keydown', onKeyDown);
  };
}
