export type MathEngineEventName = 'hover' | 'select' | 'state';

export interface MathEngineAction {
  id: string;
  label: string;
  kind: string;
}

export type MathEngineEventCallback = (payload: unknown) => void;

export interface MathEngine {
  mount(host: HTMLElement, initial: string): void;
  on(event: MathEngineEventName, cb: MathEngineEventCallback): () => void;
  getLegalActions(): MathEngineAction[];
  apply(actionId: string): void;
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
}

export interface MathBridgeHandle {
  destroy(): void;
  refresh(): void;
  setExpression(expr: string): void;
}
