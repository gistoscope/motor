import { createTilError } from "./errors.js";

export type TilFsmState = "idle" | "planning" | "applying" | "completed";

const transitionTable: Record<TilFsmState, Record<string, TilFsmState>> = {
  idle: {
    PLAN: "planning"
  },
  planning: {
    PLAN_READY: "applying",
    CANCEL: "idle"
  },
  applying: {
    APPLY_DONE: "completed",
    APPLY_FAILED: "idle"
  },
  completed: {
    RESET: "idle"
  }
};

export interface TilFsm {
  readonly state: TilFsmState;
  dispatch(event: string): TilFsmState;
}

export function createTilFsm(initialState: TilFsmState = "idle"): TilFsm {
  let state = initialState;

  return {
    get state() {
      return state;
    },
    dispatch(event: string): TilFsmState {
      const normalizedEvent = event.trim().toUpperCase();
      const nextState = transitionTable[state]?.[normalizedEvent];

      if (!nextState) {
        throw createTilError({
          code: "fsm.invalid_transition",
          message: `Cannot transition from "${state}" using event "${event}".`
        });
      }

      state = nextState;
      return state;
    }
  };
}
