import type { Trace } from "@til/core";

export type TraceObserver = (trace: Trace) => void;

export class TraceSubject {
  private readonly observers = new Set<TraceObserver>();

  subscribe(observer: TraceObserver): () => void {
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  }

  emit(trace: Trace): void {
    for (const observer of this.observers) {
      observer(trace);
    }
  }
}
