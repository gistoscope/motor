import type { AST, NodeId } from './opTokens';
import { getOwnerId } from './opTokens';

type DragApi = {
  getAst(): AST;
  getSelection(): NodeId[];
  setSelection(ids: NodeId[]): void;
};

function closestAstElement(target: EventTarget | null): HTMLElement | null {
  if (!target || !(target instanceof Node)) {
    return null;
  }
  const base = target instanceof Element ? target : target.parentElement;
  return (base?.closest?.('[data-ast-id]') as HTMLElement | null) ?? null;
}

function nodesFor(ast: AST): Record<NodeId, any> {
  return ((ast as any)?.nodes ?? {}) as Record<NodeId, any>;
}

function parentFor(ast: AST): Record<NodeId, NodeId> {
  return ((ast as any)?.parent ?? {}) as Record<NodeId, NodeId>;
}

function linearOrder(ast: AST): NodeId[] {
  const linear = (ast as any)?.linear;
  return Array.isArray(linear) ? (linear as NodeId[]) : [];
}

function nodeSpan(ast: AST, nodeId: NodeId | null): NodeId[] {
  if (!nodeId) return [];
  const span = nodesFor(ast)[nodeId]?.span;
  if (Array.isArray(span) && span.length > 0) {
    return span.slice();
  }
  const linear = linearOrder(ast);
  if (linear.includes(nodeId)) {
    return [nodeId];
  }
  const tokens = (ast as any)?.tokens;
  if (tokens && tokens[nodeId]) {
    return [nodeId];
  }
  return [];
}

function normalizeSeed(ast: AST, id: NodeId): NodeId {
  const nodes = nodesFor(ast);
  if (nodes[id]?.span) {
    return id;
  }
  const owner = getOwnerId(ast, id);
  if (owner) {
    return owner;
  }
  return id;
}

function ancestorChain(ast: AST, seed: NodeId): NodeId[] {
  const parents = parentFor(ast);
  const nodes = nodesFor(ast);
  const list: NodeId[] = [];
  const seen = new Set<NodeId>();
  let current: NodeId | null = seed;

  while (current && !seen.has(current)) {
    list.push(current);
    seen.add(current);

    const parentFromMap: NodeId | undefined = parents[current];
    if (parentFromMap && parentFromMap !== current) {
      current = parentFromMap;
      continue;
    }

    const nodeEntry: any = nodes[current];
    const parentCandidate: NodeId | null =
      typeof nodeEntry?.parent === 'string' && nodeEntry.parent !== current
        ? (nodeEntry.parent as NodeId)
        : typeof nodeEntry?.owner === 'string' && nodeEntry.owner !== current
        ? (nodeEntry.owner as NodeId)
        : typeof nodeEntry?.parentId === 'string' && nodeEntry.parentId !== current
        ? (nodeEntry.parentId as NodeId)
        : null;

    if (parentCandidate) {
      current = parentCandidate;
      continue;
    }

    break;
  }

  return list;
}

function firstTokenOfSpan(span: NodeId[]): NodeId | null {
  if (!span.length) return null;
  return span[0] ?? null;
}

function lastTokenOfSpan(span: NodeId[]): NodeId | null {
  if (!span.length) return null;
  return span[span.length - 1] ?? null;
}

function sliceLinear(ast: AST, startToken: NodeId | null, endToken: NodeId | null): NodeId[] {
  const linear = linearOrder(ast);
  if (!startToken || !endToken || linear.length === 0) {
    return [];
  }
  const startIndex = linear.indexOf(startToken);
  const endIndex = linear.indexOf(endToken);
  if (startIndex < 0 || endIndex < 0) {
    return [];
  }
  const from = Math.min(startIndex, endIndex);
  const to = Math.max(startIndex, endIndex);
  return linear.slice(from, to + 1);
}

export function computeDragSelectionSpan(ast: AST, startId: NodeId, endId: NodeId): NodeId[] {
  const startNode = normalizeSeed(ast, startId);
  const endNode = normalizeSeed(ast, endId);

  if (startNode === endNode) {
    const span = nodeSpan(ast, startNode);
    if (span.length) {
      return span;
    }
  }

  const startAncestors = new Set(ancestorChain(ast, startNode));
  const endAncestors = ancestorChain(ast, endNode);
  let lca: NodeId | null = null;

  for (const candidate of endAncestors) {
    if (startAncestors.has(candidate)) {
      lca = candidate;
      break;
    }
  }

  if (lca) {
    const lcaSpan = nodeSpan(ast, lca);
    if (lcaSpan.length) {
      return lcaSpan;
    }
  }

  const startSpan = nodeSpan(ast, startNode);
  const endSpan = nodeSpan(ast, endNode);
  const startToken = firstTokenOfSpan(startSpan) ?? startId;
  const endToken = lastTokenOfSpan(endSpan) ?? endId;
  const linearSlice = sliceLinear(ast, startToken, endToken);
  if (linearSlice.length) {
    return linearSlice;
  }

  if (startSpan.length) {
    return startSpan;
  }
  if (endSpan.length) {
    return endSpan;
  }
  return startId === endId ? [startId] : [startId, endId];
}

export function wireDragSelection(root: HTMLElement, api: DragApi): () => void {
  let pointerId: number | null = null;
  let startId: NodeId | null = null;
  let captured: Element | null = null;

  const reset = () => {
    pointerId = null;
    startId = null;
    captured = null;
  };

  const releaseCapture = () => {
    if (captured && pointerId !== null) {
      try {
        captured.releasePointerCapture(pointerId);
      } catch {
        // ignore failures
      }
    }
    captured = null;
  };

  const getIdFromEvent = (event: PointerEvent): NodeId | null => {
    const el = closestAstElement(event.target);
    if (!el) return null;
    return (el.getAttribute('data-ast-id') ?? null) as NodeId | null;
  };

  const handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 0) {
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    const id = getIdFromEvent(event);
    if (!id) {
      return;
    }

    pointerId = event.pointerId;
    startId = id;
    captured = event.target instanceof Element ? event.target : null;
    captured?.setPointerCapture?.(event.pointerId);
  };

  const handlePointerUp = (event: PointerEvent) => {
    if (pointerId === null || event.pointerId !== pointerId) {
      return;
    }

    const endId = getIdFromEvent(event) ?? startId;
    if (startId && endId) {
      const ast = api.getAst();
      const span = computeDragSelectionSpan(ast, startId, endId);
      if (Array.isArray(span) && span.length) {
        api.setSelection(span);
      }
    }

    releaseCapture();
    reset();
  };

  const handlePointerCancel = (event: PointerEvent) => {
    if (pointerId === null || event.pointerId !== pointerId) {
      return;
    }
    releaseCapture();
    reset();
  };

  root.addEventListener('pointerdown', handlePointerDown);
  root.addEventListener('pointerup', handlePointerUp);
  root.addEventListener('pointercancel', handlePointerCancel);

  return () => {
    releaseCapture();
    reset();
    root.removeEventListener('pointerdown', handlePointerDown);
    root.removeEventListener('pointerup', handlePointerUp);
    root.removeEventListener('pointercancel', handlePointerCancel);
  };
}
