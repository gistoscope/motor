import { createFsm } from './core/fsm.js';
import type { SparkMachine } from './core/fsm.js';
import type {
  SparkCommand,
  SparkEvent,
  SparkSnapshot,
  SparkState
} from './core/protocol.js';
import { notifyWidgets, type SparkWidget } from './widgets/index.js';

export interface SparkInstance {
  readonly state: SparkState;
  readonly history: ReadonlyArray<SparkEvent>;
  dispatch(command: SparkCommand): ReadonlyArray<SparkEvent>;
  snapshot(): SparkSnapshot;
  attach(widget: SparkWidget): void;
  detach(widget: SparkWidget): void;
}

export function createSpark(initialState: Partial<SparkState> = {}): SparkInstance {
  const machine: SparkMachine = createFsm(initialState);
  const widgets = new Set<SparkWidget>();

  return {
    get state(): SparkState {
      return machine.state;
    },
    get history(): ReadonlyArray<SparkEvent> {
      return machine.history;
    },
    dispatch(command: SparkCommand): ReadonlyArray<SparkEvent> {
      const events = machine.dispatch(command);
      if (events.length > 0) {
        notifyWidgets(widgets, events);
      }

      return events;
    },
    snapshot(): SparkSnapshot {
      return machine.snapshot();
    },
    attach(widget: SparkWidget): void {
      widgets.add(widget);
    },
    detach(widget: SparkWidget): void {
      widgets.delete(widget);
    }
  };
}

export type {
  SparkCommand,
  SparkEvent,
  SparkSnapshot,
  SparkState,
  SparkWidget
};
export { createMotorAdapter, type MotorAdapter } from './bridge/motor-adapter.js';
