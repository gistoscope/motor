import type { MathSessionController, MathSessionLog } from '../math/session';
import type { MathEngineAction } from '../math/types';

export interface ActionsPanelOptions {
  onAction?: (actionId: string) => void;
  emptyLabel?: string;
  session?: MathSessionController | null;
  onSessionExport?: (log: MathSessionLog, session: MathSessionController) => void;
  onSessionImport?: (session: MathSessionController) => unknown | Promise<unknown>;
  onSessionImported?: (log: MathSessionLog, session: MathSessionController) => void;
  onSessionReplay?: (session: MathSessionController) => void | Promise<void>;
}

export interface ActionsPanelHandle {
  readonly element: HTMLElement;
  render(actions: MathEngineAction[]): void;
  highlight(actionId: string | null): void;
  getHighlightedActionId(): string | null;
  getSession(): MathSessionController | null;
  setSession(session: MathSessionController | null): void;
  exportSession(): MathSessionLog | null;
  importSession(source: unknown): MathSessionLog | null;
  replaySession(): Promise<void>;
  destroy(): void;
}

export function createActionsPanel(
  container: HTMLElement,
  options: ActionsPanelOptions = {},
): ActionsPanelHandle {
  container.dataset.role = container.dataset.role ?? 'math-actions';
  const controls = document.createElement('div');
  controls.dataset.role = 'math-session-controls';
  const exportButton = document.createElement('button');
  exportButton.type = 'button';
  exportButton.dataset.role = 'math-session-export';
  exportButton.textContent = 'Export';
  const importButton = document.createElement('button');
  importButton.type = 'button';
  importButton.dataset.role = 'math-session-import';
  importButton.textContent = 'Import';
  const replayButton = document.createElement('button');
  replayButton.type = 'button';
  replayButton.dataset.role = 'math-session-replay';
  replayButton.textContent = 'Replay';
  controls.append(exportButton, importButton, replayButton);
  container.appendChild(controls);
  const list = document.createElement('div');
  list.dataset.role = 'math-actions-list';
  container.appendChild(list);

  let highlightedId: string | null = null;
  let buttons = new Map<string, HTMLButtonElement>();
  let session: MathSessionController | null = options.session ?? null;
  let busy = false;

  const dispatch = <DetailType>(type: string, detail: DetailType) => {
    container.dispatchEvent(new CustomEvent(type, { bubbles: true, detail }));
  };

  const updateControls = () => {
    const hasSession = session !== null;
    controls.dataset.state = hasSession ? (busy ? 'busy' : 'ready') : 'disabled';
    exportButton.disabled = !hasSession || busy;
    importButton.disabled =
      !hasSession || busy || typeof options.onSessionImport !== 'function';
    const canReplay =
      hasSession && !busy && (typeof options.onSessionReplay === 'function' || typeof options.onAction === 'function');
    replayButton.disabled = !canReplay;
  };

  const getSession = () => session;

  const setSession = (next: MathSessionController | null) => {
    session = next;
    updateControls();
  };

  const exportSession = (): MathSessionLog | null => {
    if (!session) {
      return null;
    }
    const log = session.export();
    options.onSessionExport?.(log, session);
    dispatch('math-session-export', { log, serialized: JSON.stringify(log) });
    return log;
  };

  const importSession = (source: unknown): MathSessionLog | null => {
    if (!session) {
      return null;
    }
    const log = session.import(source);
    options.onSessionImported?.(log, session);
    dispatch('math-session-import', { log, serialized: JSON.stringify(log) });
    return log;
  };

  const replaySession = async (): Promise<void> => {
    if (!session) {
      return;
    }
    if (typeof options.onSessionReplay === 'function') {
      await options.onSessionReplay(session);
      return;
    }
    if (typeof options.onAction !== 'function') {
      return;
    }
    await session.replay((actionId) => {
      options.onAction?.(actionId);
      applyHighlight(actionId);
    });
  };

  const handleExportClick = () => {
    exportSession();
  };

  const handleImportClick = async () => {
    if (!session || typeof options.onSessionImport !== 'function') {
      return;
    }
    busy = true;
    updateControls();
    try {
      const source = await options.onSessionImport(session);
      if (source == null) {
        return;
      }
      const log = importSession(source);
      if (!log) {
        return;
      }
      await replaySession();
    } finally {
      busy = false;
      updateControls();
    }
  };

  const handleReplayClick = async () => {
    if (!session) {
      return;
    }
    busy = true;
    updateControls();
    try {
      await replaySession();
    } finally {
      busy = false;
      updateControls();
    }
  };

  exportButton.addEventListener('click', handleExportClick);
  importButton.addEventListener('click', handleImportClick);
  replayButton.addEventListener('click', handleReplayClick);

  updateControls();

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
    getSession,
    setSession,
    exportSession,
    importSession,
    replaySession,
    destroy: () => {
      exportButton.removeEventListener('click', handleExportClick);
      importButton.removeEventListener('click', handleImportClick);
      replayButton.removeEventListener('click', handleReplayClick);
      list.removeEventListener('pointerover', handlePointerOver);
      list.removeEventListener('focusin', handleFocusIn);
      container.dataset.state = 'empty';
      container.textContent = '';
      highlightedId = null;
      buttons.clear();
      session = null;
      busy = false;
    },
  };
}
