export interface HistoryEntry {
  ruleId: string;
  before: string;
  after: string;
  timestamp: number;
}

export interface HistoryPanelControls {
  canUndo?: boolean;
  canRedo?: boolean;
}

export interface HistoryPanelOptions {
  onUndo?: () => void;
  onRedo?: () => void;
  emptyLabel?: string;
}

export interface HistoryPanelHandle {
  readonly element: HTMLElement;
  render(entries: HistoryEntry[], appliedCount: number, controls?: HistoryPanelControls): void;
  destroy(): void;
}

function formatTimestamp(value: number): { iso: string; label: string } {
  const iso = new Date(value).toISOString();
  return { iso, label: iso.slice(11, 19) };
}

export function createHistoryPanel(
  container: HTMLElement,
  options: HistoryPanelOptions = {},
): HistoryPanelHandle {
  container.dataset.role = container.dataset.role ?? 'math-history';
  container.dataset.state = container.dataset.state ?? 'empty';

  const header = document.createElement('div');
  header.dataset.role = 'math-history-header';

  const title = document.createElement('span');
  title.dataset.role = 'math-history-title';
  title.textContent = 'History';

  const counter = document.createElement('span');
  counter.dataset.role = 'math-history-count';
  counter.textContent = '0/0';

  const controls = document.createElement('div');
  controls.dataset.role = 'math-history-controls';

  const undoButton = document.createElement('button');
  undoButton.type = 'button';
  undoButton.dataset.role = 'math-history-undo';
  undoButton.textContent = 'Undo';

  const redoButton = document.createElement('button');
  redoButton.type = 'button';
  redoButton.dataset.role = 'math-history-redo';
  redoButton.textContent = 'Redo';

  const list = document.createElement('div');
  list.dataset.role = 'math-history-entries';

  header.append(title, counter, controls);
  controls.append(undoButton, redoButton);
  container.append(header, list);

  const handleUndo = () => {
    options.onUndo?.();
  };

  const handleRedo = () => {
    options.onRedo?.();
  };

  undoButton.addEventListener('click', handleUndo);
  redoButton.addEventListener('click', handleRedo);

  const render = (
    entries: HistoryEntry[],
    appliedCount: number,
    state: HistoryPanelControls = {},
  ) => {
    const canUndo = state.canUndo ?? appliedCount > 0;
    const canRedo = state.canRedo ?? appliedCount < entries.length;

    undoButton.disabled = !canUndo;
    redoButton.disabled = !canRedo;

    counter.textContent = `${appliedCount}/${entries.length}`;

    list.textContent = '';
    if (entries.length === 0) {
      container.dataset.state = 'empty';
      const empty = document.createElement('p');
      empty.dataset.role = 'math-history-empty';
      empty.textContent = options.emptyLabel ?? 'No steps yet';
      list.appendChild(empty);
      return;
    }

    container.dataset.state = 'ready';
    const fragment = document.createDocumentFragment();
    entries.forEach((entry, index) => {
      const item = document.createElement('article');
      item.dataset.role = 'math-history-entry';
      item.dataset.state = index < appliedCount ? 'applied' : 'undone';
      item.dataset.ruleId = entry.ruleId;

      const rule = document.createElement('header');
      rule.dataset.role = 'math-history-rule';
      rule.textContent = entry.ruleId;

      const diff = document.createElement('p');
      diff.dataset.role = 'math-history-diff';
      diff.textContent = `${entry.before} → ${entry.after}`;

      const timestamp = document.createElement('time');
      const formatted = formatTimestamp(entry.timestamp);
      timestamp.dataset.role = 'math-history-timestamp';
      timestamp.dateTime = formatted.iso;
      timestamp.textContent = formatted.label;

      item.append(rule, diff, timestamp);
      fragment.appendChild(item);
    });

    list.appendChild(fragment);
  };

  return {
    element: container,
    render,
    destroy: () => {
      undoButton.removeEventListener('click', handleUndo);
      redoButton.removeEventListener('click', handleRedo);
      container.dataset.state = 'empty';
      container.textContent = '';
    },
  };
}
