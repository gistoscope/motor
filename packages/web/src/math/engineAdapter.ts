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
  actions?: unknown;
  state?: Record<string, unknown>;
  apply?: (actionId: string) => unknown;
  applyAction?: (actionId: string) => unknown;
  execute?: (actionId: string) => unknown;
  export?: () => { ast: unknown; html?: string; tex?: string };
  exportState?: () => { ast: unknown; html?: string; tex?: string };
}

const DEFAULT_ACTION_KIND = 'action';

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

function extractActionsFromSource(
  real: RealMathEngineLike,
  fallback: MathEngineAction[],
): MathEngineAction[] {
  let source: unknown;
  if (typeof real.getLegalActions === 'function') {
    source = real.getLegalActions();
  } else if (typeof real.listActions === 'function') {
    source = real.listActions();
  } else if (Array.isArray((real as { actions?: unknown }).actions)) {
    source = (real as { actions: unknown[] }).actions;
  } else if (real.state && typeof real.state === 'object') {
    const state = real.state as Record<string, unknown>;
    if (Array.isArray(state.legalActions)) {
      source = state.legalActions;
    } else if (Array.isArray(state.actions)) {
      source = state.actions;
    } else if (Array.isArray(state.availableActions)) {
      source = state.availableActions;
    }
  }

  if (!Array.isArray(source)) {
    return fallback;
  }

  return source.map((item, index) => normalizeAction(item, index));
}

function extractActionsFromPayload(
  payload: unknown,
  fallback: MathEngineAction[],
): MathEngineAction[] {
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    let candidate: unknown;
    if (Array.isArray(record.legalActions)) {
      candidate = record.legalActions;
    } else if (Array.isArray(record.actions)) {
      candidate = record.actions;
    } else if (Array.isArray(record.availableActions)) {
      candidate = record.availableActions;
    } else if (record.state && typeof record.state === 'object') {
      const nested = record.state as Record<string, unknown>;
      if (Array.isArray(nested.legalActions)) {
        candidate = nested.legalActions;
      } else if (Array.isArray(nested.actions)) {
        candidate = nested.actions;
      } else if (Array.isArray(nested.availableActions)) {
        candidate = nested.availableActions;
      }
    }

    if (Array.isArray(candidate)) {
      return candidate.map((item, index) => normalizeAction(item, index));
    }
  }

  return fallback;
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

  const refreshActions = () => {
    cachedActions = extractActionsFromSource(real, cachedActions);
    return cachedActions;
  };

  return {
    mount(host, initial) {
      mountRealEngine(real, host, initial);
      refreshActions();
    },
    on(event, cb) {
      if (event === 'state') {
        const wrapped: MathEngineEventCallback = (payload) => {
          cachedActions = extractActionsFromPayload(payload, cachedActions);
          cachedActions = extractActionsFromSource(real, cachedActions);
          cb(payload);
        };
        return subscribeToReal(real, event, wrapped);
      }
      return subscribeToReal(real, event, cb);
    },
    getLegalActions() {
      return refreshActions();
    },
    apply(actionId) {
      callApply(real, actionId);
      refreshActions();
    },
    export() {
      return exportState(real);
    },
  };
}
