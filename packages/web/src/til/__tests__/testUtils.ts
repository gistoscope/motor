import { vi } from 'vitest';

export type AnyFn = (...args: any[]) => any;

// Returns a pair { fn, mock }:
// - fn: a function with the exact signature F (safe to pass where a function type is expected)
// - mock: a Vitest mock that records calls/returns for assertions
export function makeTypedMock<F extends AnyFn>(impl?: F) {
  const mock = impl ? vi.fn(impl) : vi.fn();
  const fn = ((...args: any[]) => (mock as any)(...args)) as F;
  return { fn, mock };
}
