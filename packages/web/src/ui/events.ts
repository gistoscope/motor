export type EventMap = Record<string, unknown>;

export type Unsubscribe = () => void;

export type EventHub<T extends EventMap> = {
  on<K extends keyof T & string>(event: K, cb: (payload: T[K]) => void): Unsubscribe;
  off<K extends keyof T & string>(event: K, cb: (payload: T[K]) => void): void;
  emit<K extends keyof T & string>(event: K, payload: T[K]): void;
  clear(): void;
};

type EventHandler<T extends EventMap, K extends keyof T & string = keyof T & string> = (
  payload: T[K],
) => void;

export function createEventHub<T extends EventMap>(): EventHub<T> {
  const handlers = new Map<keyof T & string, Set<EventHandler<T>>>();

  const on = <K extends keyof T & string>(event: K, cb: EventHandler<T, K>): Unsubscribe => {
    let listeners = handlers.get(event);
    if (!listeners) {
      listeners = new Set();
      handlers.set(event, listeners);
    }
    listeners.add(cb as EventHandler<T>);
    return () => {
      off(event, cb);
    };
  };

  const off = <K extends keyof T & string>(event: K, cb: EventHandler<T, K>): void => {
    const listeners = handlers.get(event);
    if (!listeners) {
      return;
    }
    listeners.delete(cb as EventHandler<T>);
    if (listeners.size === 0) {
      handlers.delete(event);
    }
  };

  const emit = <K extends keyof T & string>(event: K, payload: T[K]): void => {
    const listeners = handlers.get(event);
    if (!listeners) {
      return;
    }
    for (const handler of listeners) {
      (handler as EventHandler<T, K>)(payload);
    }
  };

  const clear = () => {
    handlers.clear();
  };

  return { on, off, emit, clear };
}
