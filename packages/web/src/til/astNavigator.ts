import { AST, NodeId } from './types';

type NodeLike = {
  id?: unknown;
  text?: unknown;
  value?: unknown;
  token?: unknown;
  content?: unknown;
  symbol?: unknown;
  prev?: unknown;
  next?: unknown;
  left?: unknown;
  right?: unknown;
  lhs?: unknown;
  rhs?: unknown;
  before?: unknown;
  after?: unknown;
  previous?: unknown;
  following?: unknown;
};

type NodeCollection = Record<string, NodeLike> | Map<NodeId, NodeLike>;

type NeighborResult = {
  left?: NodeId;
  right?: NodeId;
};

const OPERATOR_CHARS = new Set(['+', '-', '*', '/', '^']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function resolveNodeId(value: unknown): NodeId | undefined {
  if (!value) {
    return undefined;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (isRecord(value) && typeof value.id === 'string') {
    return value.id;
  }

  return undefined;
}

function toNodeLike(value: unknown): NodeLike | undefined {
  if (isRecord(value)) {
    return value as NodeLike;
  }

  return undefined;
}

function fromCollection(collection: NodeCollection | undefined, id: NodeId): NodeLike | undefined {
  if (!collection) {
    return undefined;
  }

  if (collection instanceof Map) {
    return toNodeLike(collection.get(id));
  }

  const value = (collection as Record<string, unknown>)[id];
  return toNodeLike(value);
}

function getNode(ast: AST, id: NodeId): NodeLike | undefined {
  if (!ast) {
    return undefined;
  }

  const potentialCollections: Array<NodeCollection | undefined> = [];

  if (isRecord(ast)) {
    potentialCollections.push((ast as { nodes?: NodeCollection }).nodes);
    potentialCollections.push((ast as { nodeMap?: NodeCollection }).nodeMap);
    potentialCollections.push((ast as { byId?: NodeCollection }).byId);
    potentialCollections.push((ast as { map?: NodeCollection }).map);
  }

  for (const collection of potentialCollections) {
    const node = fromCollection(collection, id);
    if (node) {
      return node;
    }
  }

  if (Array.isArray(ast)) {
    for (const entry of ast) {
      const node = toNodeLike(entry);
      if (node?.id === id) {
        return node;
      }
    }
  }

  return undefined;
}

function extractFromNode(node: NodeLike | undefined, keys: Array<keyof NodeLike>): NodeId | undefined {
  if (!node) {
    return undefined;
  }

  for (const key of keys) {
    const resolved = resolveNodeId(node[key]);
    if (resolved) {
      return resolved;
    }
  }

  return undefined;
}

function tryFindSequence(ast: AST, id: NodeId): NodeId[] | undefined {
  const visited = new Set<unknown>();

  const collect = (value: unknown, depth: number): NodeId[] | undefined => {
    if (!value || depth > 3) {
      return undefined;
    }

    if (visited.has(value)) {
      return undefined;
    }

    if (Array.isArray(value)) {
      visited.add(value);
      const sequence: NodeId[] = [];
      for (const item of value) {
        const resolved = resolveNodeId(item);
        if (!resolved) {
          if (depth < 3) {
            const nested = collect(item, depth + 1);
            if (nested) {
              const index = nested.indexOf(id);
              if (index >= 0) {
                return nested;
              }
            }
          }
          return undefined;
        }
        sequence.push(resolved);
      }

      const index = sequence.indexOf(id);
      if (index >= 0) {
        return sequence;
      }

      for (const item of value) {
        const nested = collect(item, depth + 1);
        if (nested) {
          return nested;
        }
      }

      return undefined;
    }

    if (isRecord(value)) {
      visited.add(value);
      for (const nestedValue of Object.values(value)) {
        const sequence = collect(nestedValue, depth + 1);
        if (sequence) {
          return sequence;
        }
      }
    }

    return undefined;
  };

  if (isRecord(ast)) {
    for (const key of ['order', 'sequence', 'tokens', 'ids', 'children']) {
      const sequence = collect((ast as Record<string, unknown>)[key], 0);
      if (sequence) {
        return sequence;
      }
    }
  }

  return collect(ast, 0);
}

export function getTokenText(ast: AST, id: NodeId): string | undefined {
  const node = getNode(ast, id);
  if (node) {
    for (const key of ['text', 'value', 'token', 'content', 'symbol'] as const) {
      const value = node[key];
      if (typeof value === 'string') {
        return value;
      }
    }
  }

  if (isRecord(ast)) {
    for (const key of ['tokens', 'order']) {
      const collection = (ast as Record<string, unknown>)[key];
      if (Array.isArray(collection)) {
        for (const entry of collection) {
          if (typeof entry === 'string') {
            if (entry === id) {
              return entry;
            }
          } else if (isRecord(entry) && typeof entry.text === 'string' && resolveNodeId(entry.id) === id) {
            return entry.text;
          }
        }
      }
    }
  }

  return undefined;
}

export function getNeighbors(ast: AST, id: NodeId): NeighborResult {
  const node = getNode(ast, id);

  let left = extractFromNode(node, ['prev', 'left', 'lhs', 'before', 'previous']);
  let right = extractFromNode(node, ['next', 'right', 'rhs', 'after', 'following']);

  if ((!left || !right) && isRecord(ast)) {
    if (Array.isArray((ast as { order?: unknown }).order)) {
      const order = tryFindSequence((ast as { order?: unknown }).order, id);
      if (order) {
        const index = order.indexOf(id);
        if (index >= 0) {
          left = left ?? order[index - 1];
          right = right ?? order[index + 1];
        }
      }
    }

    if ((!left || !right) && Array.isArray((ast as { tokens?: unknown }).tokens)) {
      const sequence = tryFindSequence((ast as { tokens?: unknown }).tokens, id);
      if (sequence) {
        const index = sequence.indexOf(id);
        if (index >= 0) {
          left = left ?? sequence[index - 1];
          right = right ?? sequence[index + 1];
        }
      }
    }
  }

  if ((!left || !right) && Array.isArray(ast)) {
    const sequence = tryFindSequence(ast, id);
    if (sequence) {
      const index = sequence.indexOf(id);
      if (index >= 0) {
        left = left ?? sequence[index - 1];
        right = right ?? sequence[index + 1];
      }
    }
  }

  const result: NeighborResult = {};
  if (left) {
    result.left = left;
  }
  if (right) {
    result.right = right;
  }

  return result;
}

export function isOperatorChar(ch: string): boolean {
  if (typeof ch !== 'string') {
    return false;
  }

  return OPERATOR_CHARS.has(ch);
}
