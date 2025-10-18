import type { MathEngine } from './types';

export interface MathSessionLog {
  version: 1;
  actions: string[];
}

export interface MathSessionReplayOptions {
  signal?: AbortSignal | null;
  delayMs?: number;
  onStep?: (info: { actionId: string; index: number; total: number }) => void;
  onIndexChange?: (info: { index: number; total: number }) => void;
  onReset?: () => void | Promise<void>;
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
  ): MathSessionReplayHandle;
}

export interface MathSessionReplayHandle {
  readonly actions: readonly string[];
  readonly total: number;
  readonly index: number;
  readonly playing: boolean;
  step(): Promise<boolean>;
  seek(nextIndex: number): Promise<void>;
  play(speed?: number): Promise<void>;
  pause(): Promise<void>;
  destroy(): Promise<void>;
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

function pipeAbort(source: AbortSignal | null | undefined, target: AbortController): () => void {
  if (!source) {
    return () => {};
  }

  const abortTarget = () => {
    if (target.signal.aborted) {
      return;
    }
    const reason = (source as { reason?: unknown }).reason;
    if (reason !== undefined) {
      try {
        target.abort(reason);
        return;
      } catch {
        // fall through to default abort
      }
    }
    target.abort();
  };

  if (source.aborted) {
    abortTarget();
    return () => {};
  }

  source.addEventListener('abort', abortTarget, { once: true });
  return () => {
    source.removeEventListener('abort', abortTarget);
  };
}

export function createMathSession(initial?: { log?: MathSessionLog | string | null }): MathSessionController {
  const actions: string[] = [];
  let replayDepth = 0;

  if (initial?.log) {
    const parsed = parseLog(initial.log);
    actions.push(...parsed.actions);
  }

  const controller: MathSessionController = {
    get actions() {
      return actions.slice();
    },
    record(actionId: unknown) {
      if (replayDepth > 0) {
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
    replay(apply, options) {
      const signal = options?.signal ?? null;
      const baseDelay = Math.max(0, options?.delayMs ?? 0);
      const snapshot = actions.slice();
      const actionsSnapshot = Object.freeze(snapshot.slice());
      const total = actionsSnapshot.length;

      let destroyed = false;
      let index = 0;
      let playing = false;
      let pauseRequested = false;
      let playPromise: Promise<void> | null = null;
      let playAbortController: AbortController | null = null;

      const withReplayLock = async <T>(operation: () => Promise<T>): Promise<T> => {
        replayDepth += 1;
        try {
          return await operation();
        } finally {
          replayDepth -= 1;
        }
      };

      const ensureActive = () => {
        if (destroyed) {
          throw new Error('Math session replay handle was destroyed');
        }
      };

      const notifyIndex = () => {
        if (destroyed) {
          return;
        }
        options?.onIndexChange?.({ index, total });
      };

      notifyIndex();

      const stepInternal = async (): Promise<boolean> => {
        if (index >= total) {
          notifyIndex();
          return false;
        }
        if (signal?.aborted) {
          throw createAbortError(signal);
        }
        const currentIndex = index;
        const actionId = actionsSnapshot[currentIndex]!;
        options?.onStep?.({ actionId, index: currentIndex, total });
        const result = apply(actionId);
        if (result && typeof (result as Promise<void>).then === 'function') {
          await result;
        }
        index += 1;
        notifyIndex();
        return true;
      };

      const resetInternal = async (): Promise<void> => {
        if (index === 0) {
          notifyIndex();
          return;
        }
        if (typeof options?.onReset !== 'function') {
          throw new Error('Math session replay cannot reset without an onReset handler');
        }
        const result = options.onReset();
        if (result && typeof (result as Promise<void>).then === 'function') {
          await result;
        }
        index = 0;
        notifyIndex();
      };

      const pausePlayback = async (): Promise<void> => {
        if (!playing) {
          return;
        }
        pauseRequested = true;
        const pending = playPromise;
        if (playAbortController && !playAbortController.signal.aborted) {
          playAbortController.abort();
        }
        if (pending) {
          await pending;
        }
      };

      const performSeek = async (nextIndex: number): Promise<void> => {
        ensureActive();
        const normalized = Number.isFinite(nextIndex)
          ? Math.max(0, Math.min(total, Math.floor(nextIndex)))
          : total;
        await pausePlayback();
        await withReplayLock(async () => {
          if (normalized < index) {
            await resetInternal();
          }
          while (index < normalized) {
            await stepInternal();
          }
          if (index !== normalized) {
            index = normalized;
            notifyIndex();
          }
        });
        notifyIndex();
      };

      const performStep = async (): Promise<boolean> => {
        ensureActive();
        await pausePlayback();
        return withReplayLock(async () => stepInternal());
      };

      const startPlayback = (speed = 1): Promise<void> => {
        ensureActive();
        if (playing) {
          return playPromise ?? Promise.resolve();
        }
        if (index >= total) {
          notifyIndex();
          return Promise.resolve();
        }

        const normalizedSpeed = Number.isFinite(speed) && speed > 0 ? speed : 1;
        const effectiveDelay =
          baseDelay > 0 ? Math.max(0, Math.round(baseDelay / normalizedSpeed)) : 0;

        pauseRequested = false;
        playing = true;

        const localController = new AbortController();
        playAbortController = localController;
        const detachAbort = pipeAbort(signal, localController);

        const runLoop = async () => {
          try {
            await withReplayLock(async () => {
              while (index < total) {
                if (signal?.aborted) {
                  throw createAbortError(signal);
                }
                if (pauseRequested) {
                  break;
                }
                const progressed = await stepInternal();
                if (!progressed || pauseRequested) {
                  break;
                }
                if (effectiveDelay > 0 && index < total) {
                  try {
                    await wait(effectiveDelay, localController.signal);
                  } catch (error) {
                    if (pauseRequested && localController.signal.aborted && !(signal?.aborted)) {
                      break;
                    }
                    throw error;
                  }
                }
              }
            });
          } finally {
            detachAbort();
            if (playAbortController === localController) {
              playAbortController = null;
            }
            playing = false;
            pauseRequested = false;
          }
        };

        const promise = runLoop().finally(() => {
          if (playPromise === promise) {
            playPromise = null;
          }
          notifyIndex();
        });

        playPromise = promise;
        return promise;
      };

      const destroyHandle = async (): Promise<void> => {
        if (destroyed) {
          return;
        }
        destroyed = true;
        try {
          await pausePlayback();
        } finally {
          if (playAbortController && !playAbortController.signal.aborted) {
            playAbortController.abort();
          }
          playAbortController = null;
          playPromise = null;
        }
      };

      const handle: MathSessionReplayHandle = {
        get actions() {
          return actionsSnapshot.slice();
        },
        get total() {
          return total;
        },
        get index() {
          return index;
        },
        get playing() {
          return playing;
        },
        step: performStep,
        seek: performSeek,
        play: startPlayback,
        pause: pausePlayback,
        destroy: destroyHandle,
      };

      return handle;
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
