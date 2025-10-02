export interface Reason {
  code: string;
}

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; reasons: Reason[] };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function fail(reasons: Reason[] = [{ code: 'PRECONDITION_FAILED' }]): Result<never> {
  return { ok: false, reasons };
}
