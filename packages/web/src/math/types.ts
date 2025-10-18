/**
 * Discrete events that a {@link MathEngine} may emit.
 */
export type MathEngineEventName = 'hover' | 'select' | 'state';

/**
 * Description of an action that the engine can perform at the current time.
 *
 * Each action **must** expose a unique `id` so that callers can invoke it via
 * {@link MathEngine.apply}. The `label` is a human readable string that is safe
 * to present directly in the UI and the `kind` is a machine readable category
 * (for example `transform`, `history`, `explain`).
 */
export interface MathEngineAction {
  /** Stable identifier that can be passed to {@link MathEngine.apply}. */
  id: string;
  /** Human readable description that can be rendered directly to the user. */
  label: string;
  /**
   * Machine readable category used by the UI to group actions. The set of
   * possible values is engine defined but must remain consistent within a
   * session.
   */
  kind: string;
}

/** Callback signature for {@link MathEngine} event listeners. */
export type MathEngineEventCallback = (payload: unknown) => void;

/**
 * Contract that every math engine implementation must satisfy so that the web
 * experience can interact with it in a uniform way.
 */
export interface MathEngine {
  /**
   * Mount the engine into the provided DOM node and synchronously render the
   * `initial` expression. The host element is owned by the engine for the
   * lifetime of the session and will be cleared before the first render.
   */
  mount(host: HTMLElement, initial: string): void;
  /**
   * Register a listener for the given {@link MathEngineEventName}. The returned
   * function must remove the listener and be safe to call multiple times.
   */
  on(event: MathEngineEventName, cb: MathEngineEventCallback): () => void;
  /**
   * Return the actions currently available to the user. Each entry must have a
   * unique `id` and the array is free to change between invocations as the
   * engine state evolves.
   */
  getLegalActions(): MathEngineAction[];
  /**
   * Execute the action identified by `actionId`. The identifier is guaranteed
   * to come from a value previously returned by {@link getLegalActions}.
   */
  apply(actionId: string): void;
  /**
   * Export a serialisable snapshot of the current state. `ast` is required and
   * mirrors the engine's internal representation. `html` and `tex` are optional
   * renderings that, when provided, must be valid strings.
   */
  export(): { ast: unknown; html?: string; tex?: string };
}

export interface MathBridgeOptions {
  initialExpression?: string;
  actionsContainer?: HTMLElement;
  classNames?: {
    hovered?: string;
    selected?: string;
  };
  getTokenIds?: (event: 'hover' | 'select', payload: unknown) => Iterable<string>;
  toastContainer?: HTMLElement;
  toastDurationMs?: number;
  instrumentation?: {
    onAction?: (actionId: string, durationMs: number, outcome: 'ok' | 'err') => void;
  };
}

export interface MathBridgeHandle {
  destroy(): void;
  refresh(): void;
  setExpression(expr: string): void;
}
