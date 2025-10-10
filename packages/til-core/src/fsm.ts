import { createTilError } from "./errors";

export interface TinyStateMachineConfig<State extends string, Event extends string> {
  readonly initial: State;
  readonly transitions: Readonly<Record<State, Partial<Record<Event, State>>>>;
  readonly onTransition?: (details: {
    readonly from: State;
    readonly to: State;
    readonly event: Event;
  }) => void;
}

export class TinyStateMachine<State extends string, Event extends string> {
  #state: State;
  readonly #transitions: Readonly<Record<State, Partial<Record<Event, State>>>>;
  readonly #onTransition?: TinyStateMachineConfig<State, Event>["onTransition"];

  constructor(config: TinyStateMachineConfig<State, Event>) {
    this.#state = config.initial;
    this.#transitions = config.transitions;
    this.#onTransition = config.onTransition;
  }

  get state(): State {
    return this.#state;
  }

  can(event: Event): boolean {
    return Boolean(this.#transitions[this.#state]?.[event]);
  }

  dispatch(event: Event): State {
    const next = this.#transitions[this.#state]?.[event];

    if (!next) {
      throw createTilError({
        code: `fsm.invalid/${this.#state}-${event}`,
        message: `No transition for \"${event}\" from \"${this.#state}\"`,
      });
    }

    const previous = this.#state;
    this.#state = next;

    this.#onTransition?.({ from: previous, to: this.#state, event });

    return this.#state;
  }
}
