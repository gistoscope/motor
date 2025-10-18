export interface WarningsPanelHandle {
  readonly element: HTMLElement;
  render(notes: string[]): void;
  destroy(): void;
}

function normalizeNote(note: string): string {
  return note.trim();
}

export function createWarningsPanel(container: HTMLElement): WarningsPanelHandle {
  container.dataset.role = container.dataset.role ?? 'math-warnings';
  container.dataset.state = container.dataset.state ?? 'empty';

  const title = document.createElement('span');
  title.dataset.role = 'math-warnings-title';
  title.textContent = 'Domain warnings';

  const list = document.createElement('ul');
  list.dataset.role = 'math-warnings-list';

  container.append(title, list);

  const render = (notes: string[]) => {
    list.textContent = '';
    if (notes.length === 0) {
      container.dataset.state = 'empty';
      const empty = document.createElement('li');
      empty.dataset.role = 'math-warnings-empty';
      empty.textContent = 'No domain constraints';
      list.appendChild(empty);
      return;
    }

    container.dataset.state = 'ready';
    const fragment = document.createDocumentFragment();
    notes.map(normalizeNote).forEach((note) => {
      if (note.length === 0) {
        return;
      }
      const item = document.createElement('li');
      item.dataset.role = 'math-warning-item';
      item.textContent = note;
      fragment.appendChild(item);
    });

    if (!fragment.childNodes.length) {
      container.dataset.state = 'empty';
      const empty = document.createElement('li');
      empty.dataset.role = 'math-warnings-empty';
      empty.textContent = 'No domain constraints';
      list.appendChild(empty);
      return;
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
