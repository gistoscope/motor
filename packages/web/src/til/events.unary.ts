import { classifyMinus, focusForUnary } from './unary.js';
import type { AST, NodeId } from './types.js';

type WireApi = {
  getAst(): AST;
  getSelection(): NodeId[];
  setSelection(ids: NodeId[]): void;
  exec: (focus: NodeId[]) => void;
};

const AST_ATTRIBUTE = 'data-ast-id';

function resolveElement(target: EventTarget | null): HTMLElement | null {
  if (!target) {
    return null;
  }

  if (target instanceof HTMLElement) {
    return target.closest<HTMLElement>(`[${AST_ATTRIBUTE}]`);
  }

  if (target instanceof Element) {
    return target.closest<HTMLElement>(`[${AST_ATTRIBUTE}]`);
  }

  if (target instanceof Node) {
    const parent = target instanceof Text ? target.parentElement : (target as Node).parentElement;
    if (parent) {
      return parent.closest<HTMLElement>(`[${AST_ATTRIBUTE}]`);
    }
  }

  return null;
}

function getTokenFromEvent(target: EventTarget | null): { element: HTMLElement; id: string } | null {
  const element = resolveElement(target);
  if (!element) {
    return null;
  }

  const id = element.getAttribute(AST_ATTRIBUTE);
  if (!id) {
    return null;
  }

  return { element, id };
}

function isUnaryMinusToken(ast: AST, element: HTMLElement, hostId: string): boolean {
  const text = element.textContent?.trim() ?? '';
  if (!text.startsWith('-')) {
    return false;
  }

  return classifyMinus(ast, hostId) === 'UnaryMinus';
}

export function wireUnarySign(root: HTMLElement, api: WireApi): () => void {
  const handleClick = (event: MouseEvent) => {
    const token = getTokenFromEvent(event.target);
    if (!token) {
      return;
    }

    const ast = api.getAst();
    if (!isUnaryMinusToken(ast, token.element, token.id)) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    const { signId, signedSpan } = focusForUnary(ast, token.id);
    const current = api.getSelection();
    const isRepeatSignClick = current.length === 1 && current[0] === signId;

    if (event.detail > 1 || isRepeatSignClick) {
      api.setSelection([...signedSpan]);
      return;
    }

    api.setSelection([signId]);
  };

  const handleDoubleClick = (event: MouseEvent) => {
    const token = getTokenFromEvent(event.target);
    if (!token) {
      return;
    }

    const ast = api.getAst();
    if (!isUnaryMinusToken(ast, token.element, token.id)) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    const { signedSpan } = focusForUnary(ast, token.id);
    api.setSelection([...signedSpan]);
    api.exec([...signedSpan]);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Enter') {
      return;
    }

    const selection = api.getSelection();
    const signId = selection.find((id) => id.endsWith('::sign'));
    if (!signId) {
      return;
    }

    event.preventDefault();
    api.exec([signId]);
  };

  root.addEventListener('click', handleClick, true);
  root.addEventListener('dblclick', handleDoubleClick, true);
  root.addEventListener('keydown', handleKeyDown);

  return () => {
    root.removeEventListener('click', handleClick, true);
    root.removeEventListener('dblclick', handleDoubleClick, true);
    root.removeEventListener('keydown', handleKeyDown);
  };
}
