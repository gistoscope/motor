import type { Trace } from "@til/core";

export type TraceObserver = (t: Trace) => void | Promise<void>;

export interface ObserverRegistry {
  observers: ReadonlySet<TraceObserver>;
  register(o: TraceObserver): ObserverRegistry;
}

export function createObserverRegistry(initial?: Iterable<TraceObserver>): ObserverRegistry {
  const observers = new Set<TraceObserver>(initial ?? []);

  return {
    observers: observers as ReadonlySet<TraceObserver>,
    register(observer: TraceObserver): ObserverRegistry {
      if (observers.has(observer)) {
        return createObserverRegistry(observers);
      }

      return createObserverRegistry([...observers, observer]);
    }
  };
}
