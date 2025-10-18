import { createActionsPanel } from '../ui/actions';
import { createHistoryPanel, type HistoryEntry } from '../ui/history';
import { createWarningsPanel } from '../ui/warnings';
import type {
  MathBridgeHandle,
  MathBridgeOptions,
  MathEngine,
  MathEngineEventName,
} from './types';

const DEFAULT_HOVER_CLASS = 'math-token--hovered';
const DEFAULT_SELECTED_CLASS = 'math-token--selected';

function isIterable(value: unknown): value is Iterable<unknown> {
  return typeof value === 'object' && value !== null && Symbol.iterator in value;
}

function escapeAttribute(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function coerceToString(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function extractTokenIdsFromPayload(payload: unknown): string[] {
  if (payload == null) {
    return [];
  }

  if (typeof payload === 'string') {
    return [payload];
  }

  if (typeof payload === 'number' && Number.isFinite(payload)) {
    return [String(payload)];
  }

  if (Array.isArray(payload)) {
    return payload
      .map((item) => coerceToString(item))
      .filter((item): item is string => item !== null);
  }

  if (typeof payload === 'object') {
    const source = payload as Record<string, unknown>;
    const possibleLists = ['ids', 'tokens', 'tokenIds'];
    for (const key of possibleLists) {
      const maybeList = source[key];
      if (Array.isArray(maybeList)) {
        return maybeList
          .map((item) => coerceToString(item))
          .filter((item): item is string => item !== null);
      }
      if (isIterable(maybeList)) {
        return Array.from(maybeList)
          .map((item) => coerceToString(item))
          .filter((item): item is string => item !== null);
      }
    }

    const possibleScalars = ['id', 'tokenId', 'target'];
    for (const key of possibleScalars) {
      const maybe = source[key];
      const str = coerceToString(maybe);
      if (str !== null) {
        return [str];
      }
    }
  }

  return [];
}

function removeClassFromIds(
  host: HTMLElement,
  ids: Iterable<string>,
  className: string,
): void {
  for (const id of ids) {
    const selector = `[data-token-id="${escapeAttribute(id)}"]`;
    host
      .querySelectorAll<HTMLElement>(selector)
      .forEach((el) => el.classList.remove(className));
  }
}

function addClassToIds(host: HTMLElement, ids: Iterable<string>, className: string): void {
  for (const id of ids) {
    const selector = `[data-token-id="${escapeAttribute(id)}"]`;
    host
      .querySelectorAll<HTMLElement>(selector)
      .forEach((el) => el.classList.add(className));
  }
}

function dedupe(ids: Iterable<string>): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (!seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  }
  return result;
}

function normalizeTokenIds(
  event: Extract<MathEngineEventName, 'hover' | 'select'>,
  payload: unknown,
  options: MathBridgeOptions,
): string[] {
  if (options.getTokenIds) {
    const result = Array.from(options.getTokenIds(event, payload));
    return dedupe(
      result
        .map((item) => coerceToString(item))
        .filter((value): value is string => value !== null),
    );
  }
  return dedupe(extractTokenIdsFromPayload(payload));
}

type ExtendedMathBridgeOptions = MathBridgeOptions & {
  historyContainer?: HTMLElement;
  warningsContainer?: HTMLElement;
};

function normalizeNotes(notes: unknown): string[] {
  if (!Array.isArray(notes)) {
    return [];
  }
  const result: string[] = [];
  for (const note of notes) {
    if (typeof note === 'string') {
      const trimmed = note.trim();
      if (trimmed.length > 0) {
        result.push(trimmed);
      }
    }
  }
  return result;
}

function captureExpression(hostEl: HTMLElement): string {
  const text = hostEl.textContent ?? '';
  return text.replace(/\s+/g, ' ').trim();
}

export function attachMathEngine(
  viewer: unknown,
  engine: MathEngine,
  hostEl: HTMLElement,
  options: ExtendedMathBridgeOptions = {} as ExtendedMathBridgeOptions,
): MathBridgeHandle {
  void viewer;

  const hoverClass = options.classNames?.hovered ?? DEFAULT_HOVER_CLASS;
  const selectedClass = options.classNames?.selected ?? DEFAULT_SELECTED_CLASS;

  let hoveredIds = new Set<string>();
  let selectedIds = new Set<string>();

  const actionsPanel = options.actionsContainer
    ? createActionsPanel(options.actionsContainer, {
        onAction: (actionId) => {
          engine.apply(actionId);
        },
      })
    : null;

  const historyPanel = options.historyContainer
    ? createHistoryPanel(options.historyContainer, {
        onUndo: () => {
          if (supportsUndo) {
            engine.apply('undo');
          }
        },
        onRedo: () => {
          if (supportsRedo) {
            engine.apply('redo');
          }
        },
      })
    : null;

  const warningsPanel = options.warningsContainer
    ? createWarningsPanel(options.warningsContainer)
    : null;

  let historyEntries: HistoryEntry[] = [];
  let appliedHistoryCount = 0;
  let supportsUndo = false;
  let supportsRedo = false;
  let currentExpression = '';

  const updateHistoryPanel = () => {
    if (!historyPanel) {
      return;
    }
    historyPanel.render(historyEntries, appliedHistoryCount, {
      canUndo: supportsUndo && appliedHistoryCount > 0,
      canRedo: supportsRedo && appliedHistoryCount < historyEntries.length,
    });
  };

  const refreshActions = () => {
    if (!actionsPanel) {
      const actions = engine.getLegalActions();
      supportsUndo = actions.some((action) => action.id === 'undo');
      supportsRedo = actions.some((action) => action.id === 'redo');
      updateHistoryPanel();
      return;
    }
    const actions = engine.getLegalActions();
    supportsUndo = actions.some((action) => action.id === 'undo');
    supportsRedo = actions.some((action) => action.id === 'redo');
    actionsPanel.render(actions);
    updateHistoryPanel();
  };

  const updateHighlight = (
    event: Extract<MathEngineEventName, 'hover' | 'select'>,
    payload: unknown,
  ) => {
    const ids = normalizeTokenIds(event, payload, options);
    const className = event === 'hover' ? hoverClass : selectedClass;
    const previous = event === 'hover' ? hoveredIds : selectedIds;

    removeClassFromIds(hostEl, previous, className);
    addClassToIds(hostEl, ids, className);

    const target = event === 'hover' ? hoveredIds : selectedIds;
    target.clear();
    for (const id of ids) {
      target.add(id);
    }
  };

  const subscriptions: Array<() => void> = [];
  subscriptions.push(engine.on('hover', (payload) => updateHighlight('hover', payload)));
  subscriptions.push(engine.on('select', (payload) => updateHighlight('select', payload)));
  subscriptions.push(
    engine.on('state', (payload) => {
      refreshActions();

      if (warningsPanel) {
        const notes = normalizeNotes((payload as { domainNotes?: unknown })?.domainNotes);
        warningsPanel.render(notes);
      }

      const ruleId = typeof (payload as { ruleId?: unknown })?.ruleId === 'string'
        ? ((payload as { ruleId?: unknown }).ruleId as string)
        : null;

      const nextExpression = captureExpression(hostEl);

      if (ruleId === 'undo') {
        if (appliedHistoryCount > 0) {
          appliedHistoryCount -= 1;
        }
      } else if (ruleId === 'redo') {
        if (appliedHistoryCount < historyEntries.length) {
          appliedHistoryCount += 1;
        }
      } else if (ruleId) {
        if (appliedHistoryCount < historyEntries.length) {
          historyEntries = historyEntries.slice(0, appliedHistoryCount);
        }
        const entry: HistoryEntry = {
          ruleId,
          before: currentExpression,
          after: nextExpression,
          timestamp: Date.now(),
        };
        historyEntries = [...historyEntries, entry];
        appliedHistoryCount = historyEntries.length;
      } else {
        currentExpression = nextExpression;
        updateHistoryPanel();
        return;
      }

      currentExpression = nextExpression;
      updateHistoryPanel();
    }),
  );

  const handleKeydown = (event: KeyboardEvent) => {
    if (!(event.ctrlKey || event.metaKey)) {
      return;
    }
    if (event.altKey) {
      return;
    }
    const key = event.key.toLowerCase();
    if (key === 'z') {
      if (event.shiftKey) {
        if (supportsRedo) {
          event.preventDefault();
          engine.apply('redo');
        }
      } else if (supportsUndo) {
        event.preventDefault();
        engine.apply('undo');
      }
    } else if (key === 'y') {
      if (supportsRedo) {
        event.preventDefault();
        engine.apply('redo');
      }
    }
  };

  const ownerDocument = hostEl.ownerDocument ?? document;
  ownerDocument.addEventListener('keydown', handleKeydown);
  subscriptions.push(() => {
    ownerDocument.removeEventListener('keydown', handleKeydown);
  });

  engine.mount(hostEl, options.initialExpression ?? '');
  refreshActions();
  currentExpression = captureExpression(hostEl);
  updateHistoryPanel();
  if (warningsPanel) {
    warningsPanel.render([]);
  }

  return {
    destroy() {
      for (const unsubscribe of subscriptions) {
        try {
          unsubscribe();
        } catch {
          // ignore subscriber errors
        }
      }
      subscriptions.length = 0;
      if (actionsPanel) {
        actionsPanel.destroy();
      }
      if (historyPanel) {
        historyPanel.destroy();
      }
      if (warningsPanel) {
        warningsPanel.destroy();
      }
      removeClassFromIds(hostEl, hoveredIds, hoverClass);
      removeClassFromIds(hostEl, selectedIds, selectedClass);
      hoveredIds = new Set();
      selectedIds = new Set();
      hostEl.innerHTML = '';
    },
    refresh: refreshActions,
    setExpression(expr: string) {
      removeClassFromIds(hostEl, hoveredIds, hoverClass);
      removeClassFromIds(hostEl, selectedIds, selectedClass);
      hoveredIds = new Set();
      selectedIds = new Set();
      hostEl.innerHTML = '';
      historyEntries = [];
      appliedHistoryCount = 0;
      engine.mount(hostEl, expr);
      refreshActions();
      currentExpression = captureExpression(hostEl);
      updateHistoryPanel();
      if (warningsPanel) {
        warningsPanel.render([]);
      }
    },
  };
}
