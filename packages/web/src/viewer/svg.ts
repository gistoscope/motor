import type { GraphJSON } from '../api';

const SVG_NS = 'http://www.w3.org/2000/svg';
const H_SPACING = 160;
const V_SPACING = 160;
const PADDING = 48;
const MARKER_ID = 'motor-arrowhead';
const DEFAULT_NODE_RADIUS = 12;
const DEFAULT_NODE_STROKE_WIDTH = 1;
const DEFAULT_NODE_STROKE_COLOR = '#1e293b';
const DEFAULT_NODE_FILL = '#111111';
const DEFAULT_EDGE_STROKE = '#555555';
const DEFAULT_EDGE_WIDTH = 1.5;

interface Point {
  x: number;
  y: number;
}

interface ViewerStyleTokens {
  nodeRadius: number;
  nodeStrokeWidth: number;
  nodeStrokeColor: string;
  nodeFill: string;
  edgeStroke: string;
  edgeWidth: number;
}

function createSvgElement<T extends keyof SVGElementTagNameMap>(tag: T): SVGElementTagNameMap[T] {
  return document.createElementNS(SVG_NS, tag);
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function readViewerStyleTokens(container: HTMLElement): ViewerStyleTokens {
  const ownerDocument = container.ownerDocument ?? document;
  const ownerWindow = ownerDocument.defaultView ?? window;
  const computeStyle = ownerWindow && typeof ownerWindow.getComputedStyle === 'function'
    ? ownerWindow.getComputedStyle.bind(ownerWindow)
    : null;
  const elementStyle = computeStyle ? computeStyle(container) : null;
  const rootStyle = computeStyle ? computeStyle(ownerDocument.documentElement) : null;

  const readVar = (name: string): string | null => {
    const fromElement = elementStyle?.getPropertyValue(name);
    if (fromElement && fromElement.trim()) {
      return fromElement.trim();
    }
    const fromRoot = rootStyle?.getPropertyValue(name);
    if (fromRoot && fromRoot.trim()) {
      return fromRoot.trim();
    }
    return null;
  };

  const parseLength = (value: string | null, fallback: number, min = 0): number => {
    if (!value) {
      return fallback;
    }
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return fallback;
    }
    return parsed < min ? min : parsed;
  };

  const readColor = (name: string, fallback: string): string => {
    const value = readVar(name);
    return value ?? fallback;
  };

  const nodeRadius = clamp(parseLength(readVar('--gv-node-r'), DEFAULT_NODE_RADIUS, 1), 2, 240);
  const nodeStrokeWidth = clamp(parseLength(readVar('--gv-node-stroke'), DEFAULT_NODE_STROKE_WIDTH, 0.1), 0.1, 24);
  const nodeStrokeColor = readColor('--gv-node-stroke-color', readColor('--motor-graph-node-stroke', DEFAULT_NODE_STROKE_COLOR));
  const nodeFill = readColor('--gv-node-fill', readColor('--motor-graph-node-fill', DEFAULT_NODE_FILL));
  const edgeStroke = readColor('--gv-edge-stroke', readColor('--motor-graph-edge-stroke', DEFAULT_EDGE_STROKE));
  const edgeWidth = clamp(parseLength(readVar('--gv-edge-width'), DEFAULT_EDGE_WIDTH, 0.1), 0.1, 24);

  return { nodeRadius, nodeStrokeWidth, nodeStrokeColor, nodeFill, edgeStroke, edgeWidth };
}

function computeNodePositions(
  graph: GraphJSON | null | undefined,
): Array<{ id: string; label: string; position: Point }> {
  const nodes = graph?.nodes ?? [];
  const count = nodes.length;
  const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
  const result: Array<{ id: string; label: string; position: Point }> = [];

  nodes.forEach((graphNode, index) => {
    const id = String(graphNode.id);
    const label = graphNode.label ?? id;
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = PADDING + col * H_SPACING;
    const y = PADDING + row * V_SPACING;
    result.push({ id, label, position: { x, y } });
  });

  return result;
}

function ensureMarker(svg: SVGSVGElement, tokens: ViewerStyleTokens): void {
  const defs = createSvgElement('defs');
  const marker = createSvgElement('marker');
  marker.setAttribute('id', MARKER_ID);
  marker.setAttribute('viewBox', '0 0 10 10');
  marker.setAttribute('refX', '10');
  marker.setAttribute('refY', '5');
  const markerSize = Math.max(6, Math.round(tokens.edgeWidth * 4));
  marker.setAttribute('markerWidth', String(markerSize));
  marker.setAttribute('markerHeight', String(markerSize));
  marker.setAttribute('orient', 'auto-start-reverse');
  marker.setAttribute('class', 'motor-edge-marker');

  const path = createSvgElement('path');
  path.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
  path.setAttribute('class', 'motor-edge-marker-path');
  path.setAttribute('fill', tokens.edgeStroke);
  path.setAttribute('stroke', tokens.edgeStroke);
  path.setAttribute('stroke-width', tokens.edgeWidth.toString());
  defs.appendChild(marker);
  marker.appendChild(path);
  svg.appendChild(defs);
}

function lineWithArrow(from: Point, to: Point, radius: number): { start: Point; end: Point } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance === 0) {
    const start: Point = { x: from.x + radius, y: from.y };
    const end: Point = { x: from.x + radius, y: from.y - 0.01 };
    return { start, end };
  }

  const ux = dx / distance;
  const uy = dy / distance;
  const start: Point = {
    x: from.x + ux * radius,
    y: from.y + uy * radius,
  };
  const end: Point = {
    x: to.x - ux * radius,
    y: to.y - uy * radius,
  };
  return { start, end };
}

export function renderSVG(
  container: HTMLElement,
  graph: GraphJSON | null | undefined,
): SVGSVGElement | null {
  container.innerHTML = '';
  const nodes = computeNodePositions(graph);

  if (nodes.length === 0) {
    return null;
  }

  const tokens = readViewerStyleTokens(container);
  const nodeRadius = tokens.nodeRadius;

  const cols = Math.max(1, Math.ceil(Math.sqrt(nodes.length)));
  const rows = Math.max(1, Math.ceil(nodes.length / cols));
  const width = PADDING * 2 + (cols - 1) * H_SPACING;
  const height = PADDING * 2 + (rows - 1) * V_SPACING;

  const svg = createSvgElement('svg');
  svg.setAttribute('class', 'motor-graph');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));
  svg.setAttribute('xmlns', SVG_NS);
  svg.style.width = `${width}px`;
  svg.style.height = `${height}px`;
  svg.style.transformOrigin = 'top left';
  svg.style.removeProperty('transform');
  svg.style.setProperty('--motor-graph-node-fill', tokens.nodeFill);
  svg.style.setProperty('--motor-graph-node-stroke', tokens.nodeStrokeColor);
  svg.style.setProperty('--motor-graph-node-stroke-width', tokens.nodeStrokeWidth.toString());
  svg.style.setProperty('--motor-graph-edge-stroke', tokens.edgeStroke);
  svg.style.setProperty('--motor-graph-edge-marker', tokens.edgeStroke);
  svg.style.setProperty('--motor-graph-edge-stroke-width', tokens.edgeWidth.toString());

  ensureMarker(svg, tokens);

  const dispatchNodeEvent = (type: string, nodeId: string | null) => {
    const event = new CustomEvent<{ nodeId: string | null }>(type, {
      bubbles: true,
      detail: { nodeId },
    });
    svg.dispatchEvent(event);
  };

  const findNodeElement = (target: EventTarget | null): Element | null => {
    if (!(target instanceof Element)) {
      return null;
    }
    let current: Element | null = target;
    while (current) {
      if (current.hasAttribute('data-node-id')) {
        return current;
      }
      const parentElement: Element | null = current.parentElement;
      if (parentElement) {
        current = parentElement;
        continue;
      }
      const parentNode: Node | null = current.parentNode;
      current = parentNode instanceof Element ? parentNode : null;
    }
    return null;
  };

  const positionMap = new Map<string, Point>();
  nodes.forEach(({ id, position }) => positionMap.set(id, position));

  const edges = graph?.edges ?? [];
  for (const edge of edges) {
    const fromId = String(edge.from);
    const toId = String(edge.to);
    const from = positionMap.get(fromId);
    const to = positionMap.get(toId);
    if (!from || !to) continue;

    const path = createSvgElement('path');
    path.setAttribute('class', 'motor-edge');
    path.setAttribute('fill', 'none');
    path.setAttribute('marker-end', `url(#${MARKER_ID})`);
    path.dataset.from = fromId;
    path.dataset.to = toId;
    path.setAttribute('tabindex', '0');
    path.setAttribute('role', 'img');
    path.setAttribute('aria-label', `Edge ${fromId}→${toId}`);
    path.setAttribute('focusable', 'true');

    if (fromId === toId) {
      const c1x = from.x + nodeRadius;
      const c1y = from.y - nodeRadius * 1.5;
      const c2x = from.x - nodeRadius;
      const c2y = from.y - nodeRadius * 1.5;
      const endX = from.x;
      const endY = from.y - nodeRadius;
      path.setAttribute('d', `M ${from.x} ${from.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${endX} ${endY}`);
    } else {
      const { start, end } = lineWithArrow(from, to, nodeRadius);
      path.setAttribute('d', `M ${start.x} ${start.y} L ${end.x} ${end.y}`);
    }

    path.setAttribute('stroke-width', tokens.edgeWidth.toString());
    svg.appendChild(path);

    const handleEdgeFocus = () => path.classList.add('motor-edge--focus');
    const handleEdgeBlur = () => path.classList.remove('motor-edge--focus');
    path.addEventListener('focus', handleEdgeFocus);
    path.addEventListener('blur', handleEdgeBlur);
  }

  const supportsPointerEvents = typeof window !== 'undefined' && 'PointerEvent' in window;

  for (const node of nodes) {
    const group = createSvgElement('g');
    group.setAttribute('class', 'motor-node');
    group.dataset.nodeId = node.id;
    group.setAttribute('tabindex', '0');
    group.setAttribute('role', 'button');
    group.setAttribute('aria-label', `Node ${node.id}`);
    group.setAttribute('focusable', 'true');

    const circle = createSvgElement('circle');
    circle.setAttribute('class', 'motor-node-circle');
    circle.setAttribute('r', String(nodeRadius));
    circle.setAttribute('cx', String(node.position.x));
    circle.setAttribute('cy', String(node.position.y));
    circle.setAttribute('stroke-width', tokens.nodeStrokeWidth.toString());
    circle.dataset.nodeId = node.id;
    group.appendChild(circle);

    if (node.label.trim()) {
      const text = createSvgElement('text');
      text.setAttribute('class', 'motor-node-label');
      text.setAttribute('x', String(node.position.x));
      text.setAttribute('y', String(node.position.y - nodeRadius - 8));
      text.setAttribute('text-anchor', 'middle');
      text.textContent = node.label;
      group.appendChild(text);
    }

    svg.appendChild(group);

    const emitHover = () => dispatchNodeEvent('motor:node-hover', node.id);
    const emitLeave = () => dispatchNodeEvent('motor:node-leave', node.id);
    const emitSelect = () => dispatchNodeEvent('motor:node-select', node.id);
    const handleLeave = (event: Event) => {
      const related = (event as MouseEvent).relatedTarget as Node | null;
      if (related && group.contains(related)) {
        return;
      }
      emitLeave();
    };

    if (supportsPointerEvents) {
      group.addEventListener('pointerover', emitHover);
      group.addEventListener('pointerout', handleLeave);
    } else {
      group.addEventListener('mouseover', emitHover);
      group.addEventListener('mouseout', handleLeave);
    }

    group.addEventListener('click', (event) => {
      event.stopPropagation();
      emitSelect();
    });

    const handleFocus = () => group.classList.add('motor-node--focus');
    const handleBlur = () => group.classList.remove('motor-node--focus');
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        emitSelect();
      }
    };

    group.addEventListener('focus', handleFocus);
    group.addEventListener('blur', handleBlur);
    group.addEventListener('keydown', handleKeyDown);
  }

  svg.addEventListener('click', (event) => {
    const nodeElement = findNodeElement(event.target);
    const nodeId = nodeElement?.getAttribute('data-node-id') ?? null;
    dispatchNodeEvent('motor:node-select', nodeId);
  });

  container.appendChild(svg);
  return svg;
}
