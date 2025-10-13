import type { NodeId, Range, Selection } from '../types.js';

export type RenderListener = (selection: Selection | null) => void;

export interface HostAdapter {
  mount(target: Element): void;
  unmount(): void;
  nodeIdFromDom(node: Node): NodeId | null;
  rangeFromDom(range: globalThis.Range): Range | null;
  domRectsForRange(range: Range): readonly DOMRect[];
  onRender(listener: RenderListener): () => void;
}
