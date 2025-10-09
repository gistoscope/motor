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

function getClosestAstElement(target: EventTarget | null): HTMLElement | null {
  if (!target || !(target instanceof Node)) return null;
  const base = target instanceof Element ? target : target.parentElement;
  return (base?.closest?.('[data-ast-id]') as HTMLElement | null) ?? null;
}

function findOperatorInSpan(ast: AST, span: NodeId[] | undefined): NodeId | null {
  if (!Array.isArray(span)) return null;
  for (const tokenId of span) {
    if (isOperatorChar(getTokenText(ast, tokenId))) {
      return tokenId;
    }
  }
  return null;
}

export function findOperatorInSelection(ast: AST, selection: NodeId[] | undefined): NodeId | null {
  if (!selection || selection.length === 0) {
    return null;
  }

  for (const id of selection) {
    if (isOperatorChar(getTokenText(ast, id))) {
      return id;
    }
  }

  if (selection.length !== 1) {
    return null;
  }

  const ownerId = selection[0];
  if (!ownerId) {
    return null;
  }

  const ownerNode = (ast as any)?.nodes?.[ownerId];
  if (!ownerNode) {
    return null;
  }

  const fromSpan = findOperatorInSpan(ast, ownerNode?.span);
  if (fromSpan) {
    return fromSpan;
  }

  const tokens = (ast as any)?.tokens;
  if (tokens && ownerId in tokens) {
    if (isOperatorChar(getTokenText(ast, ownerId))) {
      return ownerId;
    }
  }

  const ownerMap = (ast as any)?.owner;
  if (ownerMap) {
    for (const tokenId of Object.keys(ownerMap)) {
      if (ownerMap[tokenId] === ownerId && isOperatorChar(getTokenText(ast, tokenId))) {
        return tokenId as NodeId;
      }
    }
  }

  return null;
}

function flashExecute(root: HTMLElement) {
  root.classList.add('til-exec-flash');
  setTimeout(() => root.classList.remove('til-exec-flash'), 220);
}

export function wireExecuteShortcuts(root: HTMLElement, api: Api): () => void {
  let clickTimeout: ReturnType<typeof setTimeout> | null = null;

  const onDblClick = (event: MouseEvent) => {
    if (clickTimeout) {
      clearTimeout(clickTimeout);
      clickTimeout = null;
    }

    const el = getClosestAstElement(event.target);
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
    flashExecute(root);
  };

  const onClick = (event: MouseEvent) => {
    const el = getClosestAstElement(event.target);
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

    const ast = api.getAst();
    const selection = api.getSelection();
    const opId = findOperatorInSelection(ast, selection);
    if (!opId) return;

    api.exec([opId]);
    flashExecute(root);
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
