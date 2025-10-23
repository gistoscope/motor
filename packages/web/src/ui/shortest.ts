import type { EventMap } from './events';

export type NodeId = string;

/**
 * Events for the "Shortest path" panel.
 * Must extend EventMap so it satisfies createEventHub<E extends EventMap>.
 */
export interface ShortestPanelEvents extends EventMap {
  "shortest:availability": null;
  "shortest:status": { code: string | null; message: string | null };

  "shortest:set-source": NodeId | null;
  "shortest:set-target": NodeId | null;

  "shortest:run": { source: NodeId; target: NodeId } | null;

  "overlay:toggle": { kind: "scc" | "cycles"; enabled: boolean };
  "analysis:recompute": null;
  "analysis:update": { hasCycle: boolean; sccCount: number; cycleEdges: number };

  "graph:loaded": null;
}

/**
 * TEMP compatibility exports so viewer.ts compiles while we finish wiring:
 * - viewer.ts expects these names to exist; we expose harmless stubs.
 * - later we'll replace with real binding logic (EventHub-driven).
 */
export type ShortestPanelElements = unknown;
export type ShortestPanelState = unknown;
export function bindShortestPanel(..._args: any[]): void { /* no-op stub */ }
