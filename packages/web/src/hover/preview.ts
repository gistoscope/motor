import type { Target } from './ids';
import type { PreviewResult, GVAction } from './state';
export async function previewWithTimeout(
  getLegalActions: () => GVAction[],
  target: Target,
  timeoutMs = 150,
  signal?: AbortSignal,
): Promise<PreviewResult> {
  if (!target?.id) return { ok: false, reason: 'invalid_target' };
  if (timeoutMs <= 0) return { ok: false, reason: 'timeout' };
  if (signal?.aborted) return { ok: false, reason: 'timeout' };
  let timerId: ReturnType<typeof setTimeout> | undefined;
  const timer = new Promise<PreviewResult>(resolve => {
    timerId = setTimeout(() => resolve({ ok: false, reason: 'timeout' }), timeoutMs);
  });
  let cleanupAbort: (() => void) | undefined;
  const abortPromise = signal
    ? new Promise<PreviewResult>(resolve => {
        const onAbort = () => {
          cleanupAbort?.();
          resolve({ ok: false, reason: 'timeout' });
        };
        cleanupAbort = () => signal.removeEventListener('abort', onAbort);
        if (signal.aborted) {
          onAbort();
        } else {
          signal.addEventListener('abort', onAbort);
        }
      })
    : null;
  const work = (async (): Promise<PreviewResult> => {
    try {
      const start = Date.now();
      const actions = getLegalActions();
      const duration = Date.now() - start;
      if (signal?.aborted) return { ok: false, reason: 'timeout' };
      if (duration >= timeoutMs) return { ok: false, reason: 'timeout' };
      return { ok: true, actions };
    } catch {
      return { ok: false, reason: 'invalid_state' };
    }
  })();
  const winner = await Promise.race(
    abortPromise ? [timer, work, abortPromise] : [timer, work]
  );
  if (timerId !== undefined) clearTimeout(timerId);
  if (cleanupAbort) cleanupAbort();
  return winner;
}
