import type { AST, NodeId } from './astNavigator.js';
import { expandToNode } from './astNavigator.js';

export function wireAltClickExpand(
  root: HTMLElement,
  api: {
    getAst(): AST;
    getSelection(): NodeId[];
    setSelection(ids: NodeId[]): void;
  }
): () => void {
  const onClick = (e: MouseEvent) => {
    if (!e.altKey) return;
    const el = (e.target as Element | null)?.closest?.('[data-ast-id]') as HTMLElement | null;
    if (!el) return;
    const id = el.getAttribute('data-ast-id') as NodeId | null;
    if (!id) return;

    const ast = api.getAst();
    const span = expandToNode(ast, id);
    if (span?.length) api.setSelection(span);
  };

  root.addEventListener('click', onClick);
  return () => root.removeEventListener('click', onClick);
}
