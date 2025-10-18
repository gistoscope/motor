import type { MathEngineAction } from '../math/types';

export interface ActionsPanelOptions {
  onAction?: (actionId: string) => void;
  emptyLabel?: string;
}

export interface ActionsPanelHandle {
  readonly element: HTMLElement;
  render(actions: MathEngineAction[]): void;
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

  const render = (actions: MathEngineAction[]) => {
    list.textContent = '';
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
    }

    list.appendChild(fragment);
  };

  return {
    element: container,
    render,
    destroy: () => {
      container.dataset.state = 'empty';
      container.textContent = '';
    },
  };
}
