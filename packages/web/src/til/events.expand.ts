import type { AST, NodeId } from './astNavigator';
import { expandToNode } from './astNavigator';

export function wireAltClickExpand(
  root: HTMLElement,
  api: {
    getAst(): AST;
    getSelection(): NodeId[];
    setSelection(ids: NodeId[]): void;
  }
): () => void {
  const onClick = (event: MouseEvent) => {
    if (!event.altKey) return;

    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') {
      event.stopImmediatePropagation();
    }

    const el = (event.target as Element | null)?.closest?.('[data-ast-id]') as HTMLElement | null;
    if (!el) return;
    const id = el.getAttribute('data-ast-id') as NodeId | null;
    if (!id) return;

    const ast = api.getAst();
    const span = expandToNode(ast, id);
    const ids = Array.isArray(span) ? span.slice() : [];
    api.setSelection(ids);
  };

  root.addEventListener('click', onClick, true);
  return () => root.removeEventListener('click', onClick, true);
}
