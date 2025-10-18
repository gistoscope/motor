import type { GraspGraph } from '@motor/grasp';
import { edges as listEdges, nodes as listNodes } from '@motor/grasp';

const SVG_NS = 'http://www.w3.org/2000/svg';
const NODE_RADIUS = 24;
const H_SPACING = 160;
const V_SPACING = 160;
const PADDING = 48;
const MARKER_ID = 'motor-arrowhead';

interface Point {
  x: number;
  y: number;
}

function createSvgElement<T extends keyof SVGElementTagNameMap>(tag: T): SVGElementTagNameMap[T] {
  return document.createElementNS(SVG_NS, tag);
}

function computeNodePositions(graph: GraspGraph): Array<{ id: string; label: string; position: Point }> {
  const ids = listNodes(graph);
  const count = ids.length;
  const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
  const result: Array<{ id: string; label: string; position: Point }> = [];

  ids.forEach((graspId, index) => {
    const id = String(graspId);
    const label = graph.nodes?.get(graspId)?.label ?? id;
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = PADDING + col * H_SPACING;
    const y = PADDING + row * V_SPACING;
    result.push({ id, label, position: { x, y } });
  });

  return result;
}

function ensureMarker(svg: SVGSVGElement): void {
  const defs = createSvgElement('defs');
  const marker = createSvgElement('marker');
  marker.setAttribute('id', MARKER_ID);
  marker.setAttribute('viewBox', '0 0 10 10');
  marker.setAttribute('refX', '10');
  marker.setAttribute('refY', '5');
  marker.setAttribute('markerWidth', '6');
  marker.setAttribute('markerHeight', '6');
  marker.setAttribute('orient', 'auto-start-reverse');
  marker.setAttribute('class', 'motor-edge-marker');

  const path = createSvgElement('path');
  path.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
  path.setAttribute('class', 'motor-edge-marker-path');
  defs.appendChild(marker);
  marker.appendChild(path);
  svg.appendChild(defs);
}

function lineWithArrow(from: Point, to: Point): { start: Point; end: Point } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance === 0) {
    const start: Point = { x: from.x + NODE_RADIUS, y: from.y };
    const end: Point = { x: from.x + NODE_RADIUS, y: from.y - 0.01 }; // keep marker direction stable
    return { start, end };
  }

  const ux = dx / distance;
  const uy = dy / distance;
  const start: Point = {
    x: from.x + ux * NODE_RADIUS,
    y: from.y + uy * NODE_RADIUS,
  };
  const end: Point = {
    x: to.x - ux * NODE_RADIUS,
    y: to.y - uy * NODE_RADIUS,
  };
  return { start, end };
}

export function renderSVG(container: HTMLElement, graph: GraspGraph): void {
  container.innerHTML = '';
  const nodes = computeNodePositions(graph);

  if (nodes.length === 0) {
    return;
  }

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

  ensureMarker(svg);

  const positionMap = new Map<string, Point>();
  nodes.forEach(({ id, position }) => positionMap.set(id, position));

  const edges = listEdges(graph);
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
      const c1x = from.x + NODE_RADIUS;
      const c1y = from.y - NODE_RADIUS * 1.5;
      const c2x = from.x - NODE_RADIUS;
      const c2y = from.y - NODE_RADIUS * 1.5;
      const endX = from.x;
      const endY = from.y - NODE_RADIUS;
      path.setAttribute('d', `M ${from.x} ${from.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${endX} ${endY}`);
    } else {
      const { start, end } = lineWithArrow(from, to);
      path.setAttribute('d', `M ${start.x} ${start.y} L ${end.x} ${end.y}`);
    }

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
    circle.setAttribute('r', String(NODE_RADIUS));
    circle.setAttribute('cx', String(node.position.x));
    circle.setAttribute('cy', String(node.position.y));
    circle.dataset.nodeId = node.id;
    group.appendChild(circle);

    if (node.label.trim()) {
      const text = createSvgElement('text');
      text.setAttribute('class', 'motor-node-label');
      text.setAttribute('x', String(node.position.x));
      text.setAttribute('y', String(node.position.y - NODE_RADIUS - 8));
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

  const dispatchNodeEvent = (type: string, nodeId: string | null) => {
    const event = new CustomEvent<{ nodeId: string | null }>(type, {
      bubbles: true,
      detail: { nodeId },
    });
    svg.dispatchEvent(event);
  };

  svg.addEventListener('click', (event) => {
    const nodeElement = findNodeElement(event.target);
    const nodeId = nodeElement?.getAttribute('data-node-id') ?? null;
    dispatchNodeEvent('motor:node-select', nodeId);
  });

  container.appendChild(svg);
}
