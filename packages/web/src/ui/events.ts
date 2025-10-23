export type EventMap = Record<string, unknown>;

export type EventListener<T> = (payload: T) => void;

export interface EventHub<E extends EventMap = EventMap> {
  on<K extends keyof E & string>(type: K, listener: EventListener<E[K]>): () => void;
  once<K extends keyof E & string>(type: K, listener: EventListener<E[K]>): () => void;
  off<K extends keyof E & string>(type: K, listener: EventListener<E[K]>): void;
  emit<K extends keyof E & string>(type: K, payload: E[K]): void;
  clear(): void;
}

/** Minimal type-safe event hub with no deps. */
export function createEventHub<E extends EventMap = EventMap>(): EventHub<E> {
  type UnknownListener = (payload: unknown) => void;
  const table = new Map<string, Set<UnknownListener>>();

  const ensureListeners = (type: string): Set<UnknownListener> => {
    let set = table.get(type);
    if (!set) {
      set = new Set();
      table.set(type, set);
    }
    return set;
  };

  const addListener = (type: string, listener: UnknownListener): (() => void) => {
    const set = ensureListeners(type);
    set.add(listener);
    return () => {
      const listeners = table.get(type);
      if (!listeners) {
        return;
      }
      listeners.delete(listener);
      if (listeners.size === 0) {
        table.delete(type);
      }
    };
  };

  const removeListener = (type: string, listener: UnknownListener): void => {
    const listeners = table.get(type);
    if (!listeners) {
      return;
    }
    listeners.delete(listener);
    if (listeners.size === 0) {
      table.delete(type);
    }
  };

  return {
    on(type, listener) {
      return addListener(type, listener as UnknownListener) as () => void;
    },

    once(type, listener) {
      let release: (() => void) | null = null;
      const wrapped: UnknownListener = (payload) => {
        release?.();
        (listener as UnknownListener)(payload);
      };
      release = addListener(type, wrapped);
      return () => {
        release?.();
        release = null;
      };
    },

    off(type, listener) {
      removeListener(type, listener as UnknownListener);
    },

    emit(type, payload) {
      const listeners = table.get(type);
      if (!listeners) {
        return;
      }
      for (const fn of Array.from(listeners)) {
        fn(payload);
      }
    },

    clear() {
      table.clear();
    },
  };
}
