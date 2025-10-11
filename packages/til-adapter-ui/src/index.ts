import type { Intent, Trace } from "@til/core";

export type UiEvent = { kind: string; data?: Record<string, unknown> };
export type UiSelection = { anchor: string; focus?: string; extra?: Record<string, unknown> };
export type UiPatch = { highlights?: unknown[]; updates?: unknown[] };

export interface UiAdapter {
  toIntent(evt: UiEvent, sel: UiSelection): Intent;
  applyTrace(t: Trace): UiPatch;
}
