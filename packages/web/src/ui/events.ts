export type EventMap = Record<string, unknown>;

export type EventListener<T> = (payload: T) => void;

export interface EventHub<E extends EventMap = EventMap> {
  on<K extends keyof E & string>(type: K, listener: EventListener<E[K]>): () => void;
  once<K extends keyof E & string>(type: K, listener: EventListener<E[K]>): () => void;
  off<K extends keyof E & string>(type: K, listener: EventListener<E[K]>): void;
  emit<K extends keyof E & string>(type: K, payload: E[K]): void;
  clear(): void;
}

/**
 * Minimal type-safe event hub with no deps.
 */
export function createEventHub<E extends EventMap = EventMap>(): EventHub<E> {
  const table = new Map<string, Set<Function>>();

  const _on = (type: string, listener: Function) => {
    let set = table.get(type);
    if (!set) { set = new Set(); table.set(type, set); }
    set.add(listener);
    return () => set!.delete(listener);
  };

  return {
    on: _on as EventHub<E>['on'],

    once(type, listener) {
      const off = _on(type, (payload: unknown) => {
        off();
        (listener as any)(payload);
      });
      return off as any;
    },

    off(type, listener) {
      table.get(type)?.delete(listener as any);
    },

    emit(type, payload) {
      const set = table.get(type);
      if (!set) return;
      for (const fn of Array.from(set)) (fn as any)(payload);
    },

    clear() {
      table.clear();
    },
  };
}
