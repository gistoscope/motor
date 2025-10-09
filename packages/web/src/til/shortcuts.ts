import type { AST, NodeId } from './opTokens';
import { isOperatorChar, getTokenText, getOwnerId } from './opTokens';

const SINGLE_CLICK_DELAY = 220;

type Api = {
  getAst(): AST;
  getSelection(): NodeId[];
  setSelection(ids: NodeId[]): void;
  exec: (focus: NodeId[]) => void;
};

type SelectionInfo = {
  selectionId: NodeId | null;
  tokenId: NodeId | null;
  ownerId: NodeId | null;
};

function shouldClearSelection(current: NodeId[] | undefined, selectionId: NodeId | null): boolean {
  return !!selectionId && Array.isArray(current) && current.length === 1 && current[0] === selectionId;
}

function getClosestAstElement(target: EventTarget | null): HTMLElement | null {
  if (!target || !(target instanceof Node)) return null;
  const base = target instanceof Element ? target : target.parentElement;
  return (base?.closest?.('[data-ast-id]') as HTMLElement | null) ?? null;
}

function isToken(ast: AST, id: NodeId | null): boolean {
  if (!id) return false;
  try {
    const tokens = (ast as any)?.tokens;
    return !!tokens && Object.prototype.hasOwnProperty.call(tokens, id);
  } catch {
    return false;
  }
}

function getNodeType(ast: AST, id: NodeId | null): string | null {
  if (!id) return null;
  try {
    const node = (ast as any)?.nodes?.[id];
    return typeof node?.type === 'string' ? node.type : null;
  } catch {
    return null;
  }
}

function resolveSelectionInfo(ast: AST, element: HTMLElement | null): SelectionInfo {
  let current: HTMLElement | null = element;
  while (current) {
    const id = (current.getAttribute('data-ast-id') ?? null) as NodeId | null;
    if (id) {
      const role = current.getAttribute('data-ast-role');
      const ownerId = getOwnerId(ast, id);

      if (role === 'paren-open' || role === 'paren-close') {
        if (ownerId) {
          return { selectionId: ownerId, tokenId: id, ownerId };
        }
      }

      if (isToken(ast, id)) {
        const tokenText = getTokenText(ast, id);
        if (isOperatorChar(tokenText) && ownerId) {
          return { selectionId: ownerId, tokenId: id, ownerId };
        }
        return { selectionId: id, tokenId: id, ownerId: ownerId ?? null };
      }

      const type = getNodeType(ast, id);
      if (type) {
        if (type === 'Operation' || type === 'Fraction' || type === 'Paren') {
          return { selectionId: id, tokenId: id, ownerId: id };
        }
        return { selectionId: id, tokenId: id, ownerId: ownerId ?? null };
      }

      if (ownerId) {
        return { selectionId: ownerId, tokenId: id, ownerId };
      }
    }
    current = current.parentElement;
  }
  return { selectionId: null, tokenId: null, ownerId: null };
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

    const id = (el.getAttribute('data-ast-id') ?? null) as NodeId | null;
    if (!id) return;

    const ast = api.getAst();
    const token = getTokenText(ast, id);
    if (!isOperatorChar(token)) return;

    const ownerId = getOwnerId(ast, id);
    api.setSelection(ownerId ? [ownerId] : [id]);
    api.exec([id]);
    flashExecute(root);
  };

  const onClick = (event: MouseEvent) => {
    const el = getClosestAstElement(event.target);
    if (!el) return;

    if (clickTimeout) {
      clearTimeout(clickTimeout);
    }

    clickTimeout = setTimeout(() => {
      clickTimeout = null;

      const ast = api.getAst();
      const info = resolveSelectionInfo(ast, el);
      if (!info.selectionId) {
        return;
      }

      const current = api.getSelection();
      if (shouldClearSelection(current, info.selectionId)) {
        api.setSelection([]);
        return;
      }

      api.setSelection([info.selectionId]);
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
