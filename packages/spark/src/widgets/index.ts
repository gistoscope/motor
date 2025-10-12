import type { SparkEvent } from '../core/protocol.js';

export type SparkWidget = (event: SparkEvent) => void;

export function notifyWidgets(
  widgets: Iterable<SparkWidget>,
  events: ReadonlyArray<SparkEvent>
): void {
  for (const widget of widgets) {
    for (const event of events) {
      widget(event);
    }
  }
}

export function createEventCollector(target: SparkEvent[]): SparkWidget {
  return (event: SparkEvent): void => {
    target.push(event);
  };
}
