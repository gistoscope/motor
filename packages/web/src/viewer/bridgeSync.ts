export type GraphEventType = 'motor:node-hover' | 'motor:node-leave' | 'motor:node-select';

export interface GraphEventDetail {
  nodeId: string | null;
  source?: 'engine' | 'graph';
}

const GRAPH_SVG_SELECTOR = '[data-role="svg-root"] svg';

export function dispatchGraphEvent(type: GraphEventType, nodeId: string | null): void {
  if (typeof document === 'undefined') {
    return;
  }

  const normalized = typeof nodeId === 'string' ? nodeId.trim() || null : null;
  const targets = document.querySelectorAll<SVGElement>(GRAPH_SVG_SELECTOR);
  targets.forEach((svg) => {
    const event = new CustomEvent<GraphEventDetail>(type, {
      bubbles: true,
      detail: { nodeId: normalized, source: 'engine' },
    });
    svg.dispatchEvent(event);
  });
}

