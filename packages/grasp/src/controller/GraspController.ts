import type { HostAdapter, RenderListener } from '../mapping/HostAdapter.js';
import type { NodeId, Range, Selection } from '../types.js';

export type GraspEventMap = {
  selectionchange: Selection;
  exec: { command: string; payload: unknown };
};

export type GraspEvent = keyof GraspEventMap;
export type Listener<E extends GraspEvent> = (payload: GraspEventMap[E]) => void;

export class GraspController {
  private mounted = false;
  private selection: Selection | null = null;
  private readonly listeners = new Map<GraspEvent, Set<(payload: unknown) => void>>();
  private renderDisposer: (() => void) | null = null;

  constructor(private readonly adapter: HostAdapter) {}

  mount(target: Element, listener?: RenderListener): void {
    if (this.mounted) return;
    this.adapter.mount(target);
    if (listener) {
      this.renderDisposer = this.adapter.onRender(listener);
    }
    this.mounted = true;
  }

  unmount(): void {
    if (!this.mounted) return;
    if (this.renderDisposer) {
      this.renderDisposer();
      this.renderDisposer = null;
    }
    this.adapter.unmount();
    this.mounted = false;
  }

  getSelection(): Selection | null {
    return this.selection;
  }

  setSelection(next: Selection): void {
    this.selection = this.normalize(next);
    this.emit('selectionchange', this.selection);
  }

  exec(command: string, payload: unknown = undefined): void {
    this.emit('exec', { command, payload });
  }

  on<E extends GraspEvent>(event: E, listener: Listener<E>): () => void {
    const bucket = this.listeners.get(event) ?? new Set();
    bucket.add(listener as (payload: unknown) => void);
    this.listeners.set(event, bucket);
    return () => {
      bucket.delete(listener as (payload: unknown) => void);
      if (bucket.size === 0) {
        this.listeners.delete(event);
      }
    };
  }

  private emit<E extends GraspEvent>(event: E, payload: GraspEventMap[E]): void {
    const bucket = this.listeners.get(event);
    if (!bucket) return;
    for (const listener of bucket) {
      listener(payload);
    }
  }

  private normalize(selection: Selection): Selection {
    const copyNodeId = (nodeId: NodeId): NodeId => Object.freeze([...nodeId]) as NodeId;
    const copyRange = (range: Range): Range =>
      Object.freeze({
        start: copyNodeId(range.start),
        end: copyNodeId(range.end),
      }) as Range;

    const deduped = new Map<string, Range>();

    for (const range of selection.ranges) {
      const serialized = `${range.start.join('.')}:${range.end.join('.')}`;
      if (!deduped.has(serialized)) {
        deduped.set(serialized, copyRange(range));
      }
    }

    const sortedRanges = Object.freeze(
      Array.from(deduped.values()).sort((a, b) => this.compareNodeIds(a.start, b.start))
    ) as readonly Range[];

    const normalized = {
      anchor: copyNodeId(selection.anchor),
      focus: copyNodeId(selection.focus),
      ranges: sortedRanges,
    } as Selection;

    return Object.freeze(normalized);
  }

  private compareNodeIds(a: NodeId, b: NodeId): number {
    const length = Math.max(a.length, b.length);
    for (let index = 0; index < length; index += 1) {
      const left = a[index] ?? -1;
      const right = b[index] ?? -1;
      if (left < right) return -1;
      if (left > right) return 1;
    }
    return 0;
  }
}
