import type { SparkMachine } from '../core/fsm.js';
import type { SparkCommand, SparkEvent } from '../core/protocol.js';

export type MotorDispatch = (events: ReadonlyArray<SparkEvent>) => void;

export interface MotorAdapter {
  handle(command: SparkCommand): ReadonlyArray<SparkEvent>;
}

export function createMotorAdapter(
  machine: SparkMachine,
  dispatch: MotorDispatch
): MotorAdapter {
  return {
    handle(command: SparkCommand): ReadonlyArray<SparkEvent> {
      const events = machine.dispatch(command);
      if (events.length > 0) {
        dispatch(events);
      }

      return events;
    }
  };
}
