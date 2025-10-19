import type { MathEngineEventCallback, RealMathEngineLike } from './types';

export interface StubRealMathEngineOptions {
  initialState?: unknown;
  parseResultFactory?: (input: string) => unknown;
  executeResultFactory?: (actionId: string) => unknown;
}

type ListenerRegistry = Map<string, Set<MathEngineEventCallback>>;

export class StubRealMathEngine implements RealMathEngineLike {
  #listeners: ListenerRegistry = new Map();
  #state: unknown;
  #parseResultFactory: (input: string) => unknown;
  #executeResultFactory: (actionId: string) => unknown;

  constructor(options: StubRealMathEngineOptions = {}) {
    this.#state = options.initialState ?? null;
    this.#parseResultFactory =
      options.parseResultFactory ?? ((input) => ({ type: 'parse', input }));
    this.#executeResultFactory =
      options.executeResultFactory ?? ((actionId) => ({ type: 'execute', actionId }));
  }

  parse(input: string): unknown {
    const result = this.#parseResultFactory(input);
    this.#state = result;
    this.emit('parse', result);
    return result;
  }

  execute(actionId: string): unknown {
    const result = this.#executeResultFactory(actionId);
    this.emit('execute', result);
    return result;
  }

  exportState(): unknown {
    return this.#state;
  }

  on(event: string, cb: MathEngineEventCallback): unknown {
    let listeners = this.#listeners.get(event);
    if (!listeners) {
      listeners = new Set();
      this.#listeners.set(event, listeners);
    }
    listeners.add(cb);
    return (() => {
      const current = this.#listeners.get(event);
      if (!current) {
        return;
      }
      current.delete(cb);
      if (current.size === 0) {
        this.#listeners.delete(event);
      }
    }) as unknown;
  }

  emit(event: string, payload: unknown): void {
    const listeners = this.#listeners.get(event);
    if (!listeners) {
      return;
    }
    for (const listener of listeners) {
      listener(payload);
    }
  }

  clearListeners(event?: string): void {
    if (typeof event === 'string') {
      this.#listeners.delete(event);
      return;
    }
    this.#listeners.clear();
  }
}
