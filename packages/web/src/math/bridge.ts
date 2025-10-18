import { createActionsPanel } from '../ui/actions';
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

export function attachMathEngine(
  viewer: unknown,
  engine: MathEngine,
  hostEl: HTMLElement,
  options: MathBridgeOptions = {},
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

  const refreshActions = () => {
    if (!actionsPanel) {
      return;
    }
    const actions = engine.getLegalActions();
    actionsPanel.render(actions);
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
    engine.on('state', () => {
      refreshActions();
    }),
  );

  engine.mount(hostEl, options.initialExpression ?? '');
  refreshActions();

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
      engine.mount(hostEl, expr);
      refreshActions();
    },
  };
}
