import './highlight.css';

import { handleCommand } from './commands';
import { attachEventDelegates } from './events';
import { listActions } from './adapter';
import { registerPairMap } from './pairMap';
import { clear, get, hover, select } from './selectionStore';
import { AST, NodeId, TILHandle, TILOptions } from './types';

function notifyFocusChange(options: TILOptions | undefined, ids: NodeId[]): void {
  options?.onFocusChange?.([...ids]);
}

export function attachTIL(
  container: HTMLElement,
  getAst: () => AST,
  options?: TILOptions,
): TILHandle {
  registerPairMap(options?.getPairMap ?? null);

  const detachEvents = attachEventDelegates(container, {
    onHover: (id) => {
      hover(id);
    },
    onSelect: (id, event) => {
      event.preventDefault();
      select([id]);
      notifyFocusChange(options, get().selectedIds);
    },
    onKeyDown: (event) => {
      handleCommand(event, {
        selection: get().selectedIds,
        clearSelection: () => {
          clear();
          notifyFocusChange(options, []);
        },
        tryAction: () => {
          const selection = get().selectedIds;
          const ast = getAst();
          void ast;
          const actions = listActions(selection);
          const first = actions[0];
          if (first) {
            options?.onAction?.({ action: first, selection });
          }
        },
      });
    },
  });

  return {
    detach() {
      detachEvents();
      registerPairMap(null);
      clear();
    },
    getSelection() {
      return [...get().selectedIds];
    },
  };
}
