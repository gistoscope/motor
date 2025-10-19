export type MathEngineEventCallback = (payload: unknown) => void;

export interface RealMathEngineLike {
  parse(input: string): unknown | Promise<unknown>;
  execute(actionId: string): unknown | Promise<unknown>;
  exportState?(): unknown;
  on?(event: string, cb: MathEngineEventCallback): unknown;
}
