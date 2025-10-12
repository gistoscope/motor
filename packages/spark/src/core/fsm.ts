import { applyPolicies, PolicyResult } from './policies.js';
import type {
  SparkCommand,
  SparkEvent,
  SparkSnapshot,
  SparkState
} from './protocol.js';

export interface SparkMachine {
  readonly state: SparkState;
  readonly history: ReadonlyArray<SparkEvent>;
  dispatch(command: SparkCommand): SparkEvent[];
  snapshot(): SparkSnapshot;
}

const INITIAL_STATE: SparkState = {
  selection: null,
  preview: null,
  lastHint: null
};

export function createFsm(initialState: Partial<SparkState> = {}): SparkMachine {
  let state: SparkState = { ...INITIAL_STATE, ...initialState };
  let history: SparkEvent[] = [];

  return {
    get state(): SparkState {
      return state;
    },
    get history(): ReadonlyArray<SparkEvent> {
      return history;
    },
    dispatch(command: SparkCommand): SparkEvent[] {
      const result: PolicyResult = applyPolicies(state, command);
      state = result.state;
      history = history.concat(result.events);
      return result.events;
    },
    snapshot(): SparkSnapshot {
      return { ...state, history: [...history] };
    }
  };
}
