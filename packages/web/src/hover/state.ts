import type { Target } from './ids';
export type GVAction = { id: string; label: string; kind?: string };
export type HoverState = { target: Target; related?: string[] } | null;
export type PreviewResult =
  | { ok: true; actions: GVAction[] }
  | { ok: false; reason: 'invalid_target'|'invalid_state'|'timeout' };
export type GVEvent =
  | { type: 'hover';   state: HoverState }
  | { type: 'preview'; target: Target; result: PreviewResult };
export class EventBus {
  private ls = new Set<(e:GVEvent)=>void>();
  on(cb:(e:GVEvent)=>void){ this.ls.add(cb); return ()=>this.ls.delete(cb); }
  emit(e:GVEvent){ for (const cb of Array.from(this.ls)) { try { cb(e); } catch {} } }
}
