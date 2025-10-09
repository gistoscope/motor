import type { AST, NodeId } from './opTokens';
import { isOperatorChar, getTokenText, getOwnerId } from './opTokens';

const SINGLE_CLICK_DELAY = 220;

type Api = {
  getAst(): AST;
  getSelection(): NodeId[];
  setSelection(ids: NodeId[]): void;
  exec: (focus: NodeId[]) => void;
};

function shouldClearSelection(
  current: NodeId[] | undefined,
  id: NodeId,
  ownerId: NodeId | null,
): boolean {
  if (!current || current.length !== 1) return false;
  const currentId = current[0];
  return currentId === id || (!!ownerId && currentId === ownerId);
}

export function wireExecuteShortcuts(root: HTMLElement, api: Api): () => void {
  let clickTimeout: ReturnType<typeof setTimeout> | null = null;

  const onDblClick = (event: MouseEvent) => {
    if (clickTimeout) {
      clearTimeout(clickTimeout);
      clickTimeout = null;
    }

    const target = event.target as Element | null;
    const el = target?.closest?.('[data-ast-id]') as HTMLElement | null;
    if (!el) return;

    const id = el.getAttribute('data-ast-id') as NodeId | null;
    if (!id) return;

    const ast = api.getAst();
    const token = getTokenText(ast, id);
    if (!isOperatorChar(token)) return;

    const ownerId = getOwnerId(ast, id);
    const selectionId = ownerId ?? id;

    api.setSelection([selectionId]);
    api.exec([id]);
  };

  const onClick = (event: MouseEvent) => {
    const target = event.target as Element | null;
    const el = target?.closest?.('[data-ast-id]') as HTMLElement | null;
    if (!el) return;

    const id = el.getAttribute('data-ast-id') as NodeId | null;
    if (!id) return;

    if (clickTimeout) {
      clearTimeout(clickTimeout);
    }

    clickTimeout = setTimeout(() => {
      clickTimeout = null;

      const ast = api.getAst();
      const token = getTokenText(ast, id);
      const ownerId = isOperatorChar(token) ? getOwnerId(ast, id) : null;

      const current = api.getSelection();
      if (shouldClearSelection(current, id, ownerId)) {
        api.setSelection([]);
        return;
      }

      const selectionId = ownerId ?? id;
      api.setSelection([selectionId]);
    }, SINGLE_CLICK_DELAY);
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

  root.addEventListener('click', onClick);
  root.addEventListener('dblclick', onDblClick);
  root.addEventListener('keydown', onKeyDown);

  return () => {
    if (clickTimeout) {
      clearTimeout(clickTimeout);
      clickTimeout = null;
    }

    root.removeEventListener('click', onClick);
    root.removeEventListener('dblclick', onDblClick);
    root.removeEventListener('keydown', onKeyDown);
  };
}
