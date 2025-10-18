import type {
  MathEngine,
  MathEngineAction,
  MathEngineEventCallback,
  MathEngineEventName,
} from './types';

type RealEngineEventName = MathEngineEventName | string;

interface RealEngineEventsAPI {
  on?: (event: RealEngineEventName, cb: MathEngineEventCallback) => unknown;
  off?: (event: RealEngineEventName, cb: MathEngineEventCallback) => unknown;
  addListener?: (event: RealEngineEventName, cb: MathEngineEventCallback) => unknown;
  removeListener?: (event: RealEngineEventName, cb: MathEngineEventCallback) => unknown;
}

export interface RealMathEngineLike {
  mount?: (host: HTMLElement, initial?: unknown) => unknown;
  on?: RealEngineEventsAPI['on'];
  off?: RealEngineEventsAPI['off'];
  addListener?: RealEngineEventsAPI['addListener'];
  removeListener?: RealEngineEventsAPI['removeListener'];
  events?: RealEngineEventsAPI;
  getLegalActions?: () => unknown;
  listActions?: () => unknown;
  suggest?: () => unknown;
  actions?: unknown;
  state?: Record<string, unknown>;
  apply?: (actionId: string) => unknown;
  applyAction?: (actionId: string) => unknown;
  execute?: (actionId: string) => unknown;
  export?: () => { ast: unknown; html?: string; tex?: string };
  exportState?: () => { ast: unknown; html?: string; tex?: string };
}

const DEFAULT_ACTION_KIND = 'unknown';
const ACTION_KEYS = ['legalActions', 'actions', 'nextActions', 'availableActions'];

function isCleanup(fn: unknown): fn is () => void {
  return typeof fn === 'function';
}

function pickString(source: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim() !== '') {
      return value;
    }
  }
  return null;
}

function normalizeAction(source: unknown, index: number): MathEngineAction {
  if (typeof source === 'string') {
    return { id: source, label: source, kind: DEFAULT_ACTION_KIND };
  }
  if (typeof source === 'number' && Number.isFinite(source)) {
    const id = String(source);
    return { id, label: id, kind: DEFAULT_ACTION_KIND };
  }
  if (typeof source === 'object' && source !== null) {
    const record = source as Record<string, unknown>;
    const idCandidate =
      pickString(record, ['id', 'actionId', 'key']) ??
      (typeof record.stepId === 'string' ? record.stepId : null) ??
      (typeof record.uuid === 'string' ? record.uuid : null);
    const id = idCandidate ?? String(index);
    const label =
      pickString(record, ['label', 'title', 'name', 'description']) ??
      id ??
      `Action ${index + 1}`;
    const kind =
      pickString(record, ['kind', 'type', 'group', 'category']) ?? DEFAULT_ACTION_KIND;
    return { id, label, kind };
  }
  const fallbackId = String(index);
  return { id: fallbackId, label: fallbackId, kind: DEFAULT_ACTION_KIND };
}

function extractActionListFromRecord(record: Record<string, unknown>): unknown[] | null {
  for (const key of ACTION_KEYS) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value;
    }
  }
  return null;
}

function normalizeActions(input: unknown): MathEngineAction[] {
  if (Array.isArray(input)) {
    return input.map((item, index) => normalizeAction(item, index));
  }
  if (input && typeof input === 'object') {
    const record = input as Record<string, unknown>;
    const direct = extractActionListFromRecord(record);
    if (direct) {
      return direct.map((item, index) => normalizeAction(item, index));
    }
    if (record.state && typeof record.state === 'object') {
      const nested = extractActionListFromRecord(record.state as Record<string, unknown>);
      if (nested) {
        return nested.map((item, index) => normalizeAction(item, index));
      }
    }
  }
  return [];
}

function tryNormalizeActions(candidate: unknown): { actions: MathEngineAction[]; found: boolean } {
  const normalized = normalizeActions(candidate);
  if (Array.isArray(candidate)) {
    return { actions: normalized, found: true };
  }
  if (candidate && typeof candidate === 'object') {
    const record = candidate as Record<string, unknown>;
    if (extractActionListFromRecord(record)) {
      return { actions: normalized, found: true };
    }
    if (record.state && typeof record.state === 'object') {
      if (extractActionListFromRecord(record.state as Record<string, unknown>)) {
        return { actions: normalized, found: true };
      }
    }
  }
  return { actions: normalized, found: normalized.length > 0 };
}

function readActionsFromReal(real: RealMathEngineLike, current: MathEngineAction[]): MathEngineAction[] {
  const callSafely = (invocation: () => unknown): MathEngineAction[] | null => {
    try {
      const candidate = invocation();
      const { actions, found } = tryNormalizeActions(candidate);
      if (found) {
        return actions;
      }
    } catch {
      // ignore extraction errors
    }
    return null;
  };

  const accessSafely = (candidate: unknown): MathEngineAction[] | null => {
    const { actions, found } = tryNormalizeActions(candidate);
    return found ? actions : null;
  };

  if (typeof real.getLegalActions === 'function') {
    const actions = callSafely(() => real.getLegalActions!());
    if (actions) {
      return actions;
    }
  }

  if (typeof (real as { suggest?: () => unknown }).suggest === 'function') {
    const actions = callSafely(() => (real as { suggest: () => unknown }).suggest());
    if (actions) {
      return actions;
    }
  }

  if (typeof real.listActions === 'function') {
    const actions = callSafely(() => real.listActions!());
    if (actions) {
      return actions;
    }
  }

  if ('actions' in real) {
    const actions = accessSafely((real as { actions?: unknown }).actions);
    if (actions) {
      return actions;
    }
  }

  if (real.state && typeof real.state === 'object') {
    const actions = accessSafely(real.state);
    if (actions) {
      return actions;
    }
  }

  return current;
}

function selectSubscriber(
  real: RealMathEngineLike,
): ((event: RealEngineEventName, cb: MathEngineEventCallback) => unknown) | null {
  if (typeof real.on === 'function') {
    return real.on.bind(real);
  }
  if (real.events && typeof real.events.on === 'function') {
    return real.events.on.bind(real.events);
  }
  if (typeof real.addListener === 'function') {
    return real.addListener.bind(real);
  }
  if (real.events && typeof real.events.addListener === 'function') {
    return real.events.addListener.bind(real.events);
  }
  return null;
}

function selectUnsubscriber(
  real: RealMathEngineLike,
): ((event: RealEngineEventName, cb: MathEngineEventCallback) => unknown) | null {
  if (typeof real.off === 'function') {
    return real.off.bind(real);
  }
  if (real.events && typeof real.events.off === 'function') {
    return real.events.off.bind(real.events);
  }
  if (typeof real.removeListener === 'function') {
    return real.removeListener.bind(real);
  }
  if (real.events && typeof real.events.removeListener === 'function') {
    return real.events.removeListener.bind(real.events);
  }
  return null;
}

function subscribeToReal(
  real: RealMathEngineLike,
  event: MathEngineEventName,
  cb: MathEngineEventCallback,
): () => void {
  const subscribe = selectSubscriber(real);
  if (subscribe) {
    const maybeCleanup = subscribe(event, cb);
    if (isCleanup(maybeCleanup)) {
      return maybeCleanup;
    }
  }

  return () => {
    const unsubscribe = selectUnsubscriber(real);
    if (!unsubscribe) {
      return;
    }
    try {
      unsubscribe(event, cb);
    } catch {
      // ignore unsubscription errors
    }
  };
}

function mountRealEngine(real: RealMathEngineLike, host: HTMLElement, initial: string): void {
  if (typeof real.mount !== 'function') {
    return;
  }
  const mount = real.mount.bind(real);
  const attempts: Array<() => void> = [
    () => {
      mount(host, initial);
    },
    () => {
      mount(host, { expression: initial });
    },
    () => {
      mount(host);
    },
  ];

  for (const attempt of attempts) {
    try {
      attempt();
      return;
    } catch {
      // try next signature
    }
  }
}

function callApply(real: RealMathEngineLike, actionId: string): void {
  if (typeof real.apply === 'function') {
    real.apply(actionId);
    return;
  }
  if (typeof real.applyAction === 'function') {
    real.applyAction(actionId);
    return;
  }
  if (typeof real.execute === 'function') {
    real.execute(actionId);
  }
}

function exportState(real: RealMathEngineLike): { ast: unknown; html?: string; tex?: string } {
  if (typeof real.export === 'function') {
    const snapshot = real.export();
    if (snapshot && typeof snapshot === 'object') {
      return snapshot;
    }
  }
  if (typeof real.exportState === 'function') {
    const snapshot = real.exportState();
    if (snapshot && typeof snapshot === 'object') {
      return snapshot;
    }
  }
  return { ast: null };
}

export function fromRealEngine(real: RealMathEngineLike): MathEngine {
  let cachedActions: MathEngineAction[] = [];
  let stateEventEpoch = 0;

  const cloneActions = () => cachedActions.map((action) => ({ ...action }));

  const setActions = (actions: MathEngineAction[]) => {
    cachedActions = actions.map((action) => ({ ...action }));
  };

  const syncActionsFromReal = () => {
    const next = readActionsFromReal(real, cachedActions);
    setActions(next);
  };

  return {
    mount(host, initial) {
      mountRealEngine(real, host, initial);
      syncActionsFromReal();
    },
    on(event, cb) {
      if (event === 'state') {
        const wrapped: MathEngineEventCallback = (payload) => {
          stateEventEpoch += 1;
          const { actions, found } = tryNormalizeActions(payload);
          if (found) {
            setActions(actions);
          } else {
            syncActionsFromReal();
          }
          cb(payload);
        };
        return subscribeToReal(real, event, wrapped);
      }
      return subscribeToReal(real, event, cb);
    },
    getLegalActions() {
      return cloneActions();
    },
    apply(actionId) {
      callApply(real, actionId);
      const epochSnapshot = stateEventEpoch;
      queueMicrotask(() => {
        if (epochSnapshot === stateEventEpoch) {
          syncActionsFromReal();
        }
      });
    },
    export() {
      return exportState(real);
    },
  };
}
