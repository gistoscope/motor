import type { Trace } from "@til/core";

export type TraceObserver = (trace: Trace) => void | Promise<void>;

export interface ObserverRegistry {
  readonly observers: ReadonlySet<TraceObserver>;
  register(observer: TraceObserver): ObserverRegistry;
}

export function createObserverRegistry(observers?: Iterable<TraceObserver>): ObserverRegistry {
  const registry = new Set<TraceObserver>(observers ?? []);

  return {
    observers: registry,
    register(observer: TraceObserver) {
      registry.add(observer);
      return createObserverRegistry(registry);
    },
  };
}
