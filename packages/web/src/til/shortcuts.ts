import type { AST, NodeId } from './opTokens';
import { isOperatorChar, getTokenText, getOwnerId, getParenPair } from './opTokens';

const SINGLE_CLICK_DELAY = 220;

type Api = {
  getAst(): AST;
  getSelection(): NodeId[];
  setSelection(ids: NodeId[]): void;
  exec: (focus: NodeId[]) => void;
};

function shouldClearSelection(current: NodeId[] | undefined, ids: NodeId[]): boolean {
  if (!current || current.length !== ids.length) return false;
  const a = new Set(current);
  return ids.every((x) => a.has(x));
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
  if (ownerNode) {
    const fromSpan = findOperatorInSpan(ast, ownerNode?.span);
    if (fromSpan) {
      return fromSpan;
    }
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
  setTimeout(() => root.classList.remove('til-exec-flash'), SINGLE_CLICK_DELAY);
}

// Если кликнули по одной из парных скобок — вернём пару, иначе [id]
function normalizeSelection(ast: AST, id: NodeId): NodeId[] {
  const pair = getParenPair(ast, id);
  if (pair) {
    const [a, b] = pair;
    return [a, b];
  }

  const owner = getOwnerId(ast, id);
  return [owner ?? id];
}

export function wireExecuteShortcuts(root: HTMLElement, api: Api): () => void {
  let clickTimeout: ReturnType<typeof setTimeout> | null = null;

  const onDblClick = (event: MouseEvent) => {
    if (clickTimeout) {
      clearTimeout(clickTimeout);
      clickTimeout = null;
    }

    const ast = api.getAst();
    const el = getClosestAstElement(event.target);
    if (!el) return;

    const idAttr = (el.getAttribute('data-ast-id') ?? null) as NodeId | null;
    if (!idAttr) return;

    const selectionIds = normalizeSelection(ast, idAttr);
    api.setSelection(selectionIds);

    const opId = findOperatorInSelection(ast, selectionIds);
    if (!opId) return;

    api.exec([opId]);
    flashExecute(root);
  };

  const onClick = (event: MouseEvent) => {
    const el = getClosestAstElement(event.target);
    if (!el) return;

    const idAttr = (el.getAttribute('data-ast-id') ?? null) as NodeId | null;
    if (!idAttr) return;

    if (clickTimeout) {
      clearTimeout(clickTimeout);
    }

    clickTimeout = setTimeout(() => {
      clickTimeout = null;

      const ast = api.getAst();
      const selectionIds = normalizeSelection(ast, idAttr);

      if (shouldClearSelection(api.getSelection(), selectionIds)) {
        api.setSelection([]);
        return;
      }

      api.setSelection(selectionIds);
    }, SINGLE_CLICK_DELAY);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Enter') return;

    const selection = api.getSelection();
    const ast = api.getAst();
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
