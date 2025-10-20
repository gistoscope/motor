export type EventHandler<T> = (payload: T) => void;

export interface EventMap {
  [type: string]: unknown;
}

export interface EventHub<M extends EventMap> {
  on<K extends keyof M>(type: K, handler: EventHandler<M[K]>): () => void;
  off<K extends keyof M>(type: K, handler: EventHandler<M[K]>): void;
  emit<K extends keyof M>(type: K, payload: M[K]): void;
}

export function createEventHub<M extends EventMap>(): EventHub<M> {
  const listeners = new Map<keyof M, Set<(payload: unknown) => void>>();

  const on = <K extends keyof M>(type: K, handler: EventHandler<M[K]>): (() => void) => {
    let handlers = listeners.get(type);
    if (!handlers) {
      handlers = new Set();
      listeners.set(type, handlers);
    }
    handlers.add(handler as (payload: unknown) => void);
    return () => off(type, handler);
  };

  const off = <K extends keyof M>(type: K, handler: EventHandler<M[K]>): void => {
    const handlers = listeners.get(type);
    if (!handlers) {
      return;
    }
    handlers.delete(handler as (payload: unknown) => void);
    if (handlers.size === 0) {
      listeners.delete(type);
    }
  };

  const emit = <K extends keyof M>(type: K, payload: M[K]): void => {
    const handlers = listeners.get(type);
    if (!handlers) {
      return;
    }
    for (const handler of Array.from(handlers)) {
      try {
        (handler as EventHandler<M[K]>)(payload);
      } catch {
        // Ignore listener errors to avoid interrupting other handlers.
      }
    }
  };

  return { on, off, emit };
}
