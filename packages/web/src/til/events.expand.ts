import type { AST, NodeId } from './opTokens';
import { getOwnerId } from './opTokens';

/**
 * Alt+Click: расширить выделение до owner-узла (Paren/Fraction/Operation/…)
 * ВАЖНО: выделение должно сохраняться (не «флэш»).
 */
export function wireAltClickExpand(
  root: HTMLElement,
  api: {
    getAst(): AST;
    getSelection(): NodeId[];
    setSelection(ids: NodeId[]): void;
  },
): () => void {
  const onClick = (event: MouseEvent) => {
    if (!event.altKey) return;

    const el = (event.target as Element | null)?.closest?.('[data-ast-id]') as HTMLElement | null;
    if (!el) return;

    const id = (el.getAttribute('data-ast-id') ?? null) as NodeId | null;
    if (!id) return;

    event.preventDefault();
    event.stopPropagation();

    const ast = api.getAst();
    const owner = getOwnerId(ast, id);
    const selectionId = owner ?? id;

    api.setSelection([selectionId]); // сохраняем расширенное выделение
  };

  root.addEventListener('click', onClick);
  return () => root.removeEventListener('click', onClick);
}
