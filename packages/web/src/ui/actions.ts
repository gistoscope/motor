import type { MathEngineAction } from '../math/types';

export interface ActionsPanelOptions {
  onAction?: (actionId: string) => void;
  emptyLabel?: string;
}

export interface ActionsPanelHandle {
  readonly element: HTMLElement;
  render(actions: MathEngineAction[]): void;
  highlight(actionId: string | null): void;
  getHighlightedActionId(): string | null;
  destroy(): void;
}

export function createActionsPanel(
  container: HTMLElement,
  options: ActionsPanelOptions = {},
): ActionsPanelHandle {
  container.dataset.role = container.dataset.role ?? 'math-actions';
  const list = document.createElement('div');
  list.dataset.role = 'math-actions-list';
  container.appendChild(list);

  let highlightedId: string | null = null;
  let buttons = new Map<string, HTMLButtonElement>();

  const applyHighlight = (nextId: string | null) => {
    if (highlightedId && buttons.has(highlightedId)) {
      const current = buttons.get(highlightedId);
      if (current) {
        delete current.dataset.state;
      }
    }

    highlightedId = nextId && buttons.has(nextId) ? nextId : null;

    if (highlightedId) {
      const next = buttons.get(highlightedId);
      if (next) {
        next.dataset.state = 'active';
      }
    }
  };

  const handlePointerOver = (event: PointerEvent) => {
    const target = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>(
      'button[data-role="math-action"]',
    );
    if (!target) {
      return;
    }
    const actionId = target.dataset.actionId ?? null;
    if (actionId && actionId !== highlightedId) {
      applyHighlight(actionId);
    }
  };

  const handleFocusIn = (event: FocusEvent) => {
    const target = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>(
      'button[data-role="math-action"]',
    );
    if (!target) {
      return;
    }
    const actionId = target.dataset.actionId ?? null;
    if (actionId && actionId !== highlightedId) {
      applyHighlight(actionId);
    }
  };

  list.addEventListener('pointerover', handlePointerOver);
  list.addEventListener('focusin', handleFocusIn);

  const render = (actions: MathEngineAction[]) => {
    list.textContent = '';
    buttons = new Map();
    if (actions.length === 0) {
      container.dataset.state = 'empty';
      const empty = document.createElement('p');
      empty.dataset.role = 'math-actions-empty';
      empty.textContent = options.emptyLabel ?? 'No actions available';
      list.appendChild(empty);
      return;
    }

    container.dataset.state = 'ready';
    const fragment = document.createDocumentFragment();
    for (const action of actions) {
      const item = document.createElement('div');
      item.dataset.role = 'math-action-item';
      item.dataset.kind = action.kind;
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.role = 'math-action';
      button.dataset.actionId = action.id;
      button.textContent = action.label;
      button.addEventListener('click', () => {
        options.onAction?.(action.id);
      });
      item.appendChild(button);
      fragment.appendChild(item);
      buttons.set(action.id, button);
    }

    list.appendChild(fragment);

    if (highlightedId && buttons.has(highlightedId)) {
      applyHighlight(highlightedId);
    } else {
      applyHighlight(actions.length > 0 ? actions[0].id : null);
    }
  };

  return {
    element: container,
    highlight: applyHighlight,
    getHighlightedActionId: () => highlightedId,
    render,
    destroy: () => {
      list.removeEventListener('pointerover', handlePointerOver);
      list.removeEventListener('focusin', handleFocusIn);
      container.dataset.state = 'empty';
      container.textContent = '';
      highlightedId = null;
      buttons.clear();
    },
  };
}
