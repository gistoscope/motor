import { pickTarget } from './hit';
import type { EventBus, PreviewResult } from './state';
import type { Target } from './ids';
export interface HoverControllerOptions {
  preview: (target: Target, timeoutMs?: number, signal?: AbortSignal) => Promise<PreviewResult>;
  timeoutMs?: number; // default 150
}
export function attachHoverController(
  root: HTMLElement,
  bus: EventBus,
  opts: HoverControllerOptions
){
  const timeoutMs = opts.timeoutMs ?? 150;
  let lastId: string | null = null;
  let rafId = 0;
  let inflight: AbortController | null = null;
  const emitHover = (t: Target | null) => {
    bus.emit({ type: 'hover', state: t ? { target:t } : null });
    if (!t) return;
    inflight?.abort();
    inflight = new AbortController();
    opts.preview(t, timeoutMs, inflight.signal)
      .then(result => { if (!inflight?.signal.aborted) bus.emit({ type:'preview', target:t, result }); })
      .catch(() => {});
  };
  const onMove = (e: PointerEvent) => {
    const t = pickTarget(e.target as Element);
    const id = t?.id ?? null;
    if (id === lastId) return;
    lastId = id;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => emitHover(t));
  };
  const onLeave = () => emitHover(null);
  root.addEventListener('pointermove', onMove);
  root.addEventListener('pointerleave', onLeave);
  return () => {
    root.removeEventListener('pointermove', onMove);
    root.removeEventListener('pointerleave', onLeave);
    inflight?.abort();
  };
}
