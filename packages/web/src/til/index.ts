import './highlight.css';

import { handleCommand } from './commands.js';
import { attachEventDelegates } from './events.js';
import { listActions } from './adapter.js';
import { registerPairMap } from './pairMap.js';
import { clear, get, hover, select } from './selectionStore.js';
import { AST, NodeId, TILHandle, TILOptions } from './types.js';

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
    onHover: (id: NodeId | null) => {
      hover(id);
    },
    onSelect: (id: NodeId, event: MouseEvent) => {
      event.preventDefault();
      select([id]);
      notifyFocusChange(options, get().selectedIds);
    },
    onKeyDown: (event: KeyboardEvent, id: NodeId | null) => {
      handleCommand(event, {
        selection: get().selectedIds,
        clearSelection: () => {
          clear();
          notifyFocusChange(options, []);
        },
        tryAction: () => {
          const selection = get().selectedIds;
          void id;
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
