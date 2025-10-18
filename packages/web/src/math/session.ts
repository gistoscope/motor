import type { MathEngine } from './types';

export interface MathSessionLog {
  version: 1;
  actions: string[];
}

export interface MathSessionReplayOptions {
  signal?: AbortSignal | null;
  delayMs?: number;
  onStep?: (info: { actionId: string; index: number; total: number }) => void;
}

export interface MathSessionController {
  readonly actions: readonly string[];
  record(actionId: unknown): void;
  reset(): void;
  export(): MathSessionLog;
  import(source: unknown): MathSessionLog;
  replay(
    apply: (actionId: string) => void | Promise<void>,
    options?: MathSessionReplayOptions,
  ): Promise<void>;
}

export interface MathSessionWrapperResult {
  engine: MathEngine;
  session: MathSessionController;
}

const SESSION_VERSION = 1;

function normalizeActionId(actionId: unknown): string | null {
  if (typeof actionId === 'string') {
    return actionId;
  }
  if (typeof actionId === 'number' && Number.isFinite(actionId)) {
    return String(actionId);
  }
  return null;
}

function parseLog(source: unknown): MathSessionLog {
  let data = source;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data) as unknown;
    } catch (error) {
      throw new Error('Invalid session log: failed to parse JSON', { cause: error });
    }
  }

  if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid session log: expected an object');
  }

  const record = data as Record<string, unknown>;
  const version = record.version;
  if (version !== SESSION_VERSION) {
    throw new Error('Invalid session log: unsupported version');
  }

  const actionsField = record.actions;
  if (!Array.isArray(actionsField)) {
    throw new Error('Invalid session log: actions must be an array');
  }

  const actions = actionsField.map((action, index) => {
    const id = normalizeActionId(action);
    if (id === null) {
      throw new Error(`Invalid session log: action at index ${index} is not a string`);
    }
    return id;
  });

  return { version: SESSION_VERSION, actions };
}

function createAbortError(signal: AbortSignal): Error {
  const reason = (signal as { reason?: unknown }).reason;
  if (reason instanceof Error) {
    return reason;
  }
  const error = new Error(typeof reason === 'string' ? reason : 'Replay aborted');
  (error as { name?: string }).name = 'AbortError';
  return error;
}

function wait(delay: number, signal?: AbortSignal | null): Promise<void> {
  if (delay <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      if (signal) {
        signal.removeEventListener('abort', handleAbort);
      }
      resolve();
    }, delay);

    const handleAbort = () => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      reject(createAbortError(signal!));
    };

    if (signal) {
      if (signal.aborted) {
        clearTimeout(timer);
        settled = true;
        reject(createAbortError(signal));
        return;
      }
      signal.addEventListener('abort', handleAbort, { once: true });
    }
  });
}

export function createMathSession(initial?: { log?: MathSessionLog | string | null }): MathSessionController {
  const actions: string[] = [];
  let replaying = false;

  if (initial?.log) {
    const parsed = parseLog(initial.log);
    actions.push(...parsed.actions);
  }

  const controller: MathSessionController = {
    get actions() {
      return actions.slice();
    },
    record(actionId: unknown) {
      if (replaying) {
        return;
      }
      const normalized = normalizeActionId(actionId);
      if (normalized !== null) {
        actions.push(normalized);
      }
    },
    reset() {
      actions.splice(0, actions.length);
    },
    export(): MathSessionLog {
      return { version: SESSION_VERSION, actions: actions.slice() };
    },
    import(source: unknown): MathSessionLog {
      const parsed = parseLog(source);
      actions.splice(0, actions.length, ...parsed.actions);
      return { version: SESSION_VERSION, actions: actions.slice() };
    },
    async replay(apply, options) {
      const signal = options?.signal ?? null;
      const delay = Math.max(0, options?.delayMs ?? 0);
      const total = actions.length;
      const snapshot = actions.slice();
      replaying = true;
      try {
        for (let index = 0; index < snapshot.length; index += 1) {
          if (signal?.aborted) {
            throw createAbortError(signal);
          }
          const actionId = snapshot[index]!;
          options?.onStep?.({ actionId, index, total });
          const result = apply(actionId);
          if (result && typeof (result as Promise<void>).then === 'function') {
            await result;
          }
          if (index < snapshot.length - 1 && delay > 0) {
            await wait(delay, signal);
          }
        }
      } finally {
        replaying = false;
      }
    },
  };

  return controller;
}

export function withMathSession(
  engine: MathEngine,
  session: MathSessionController = createMathSession(),
): MathSessionWrapperResult {
  const proxy = new Proxy(engine, {
    get(target, key, receiver) {
      const value = Reflect.get(target, key, receiver);
      if (key === 'apply' && typeof value === 'function') {
        return (actionId: string) => {
          session.record(actionId);
          return value.call(target, actionId);
        };
      }
      if (typeof value === 'function') {
        return value.bind(target);
      }
      return value;
    },
  });

  return { engine: proxy as MathEngine, session };
}

export function parseMathSessionLog(source: unknown): MathSessionLog {
  return parseLog(source);
}
