import type { GraphJSON } from '@motor/grasp';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function readLabel(candidate: unknown, preferredKeys: string[]): string | null {
  if (candidate == null) {
    return null;
  }

  const direct = readString(candidate);
  if (direct !== null) {
    return direct;
  }

  if (!isRecord(candidate)) {
    return null;
  }

  for (const key of preferredKeys) {
    const value = candidate[key];
    const text = readString(value);
    if (text !== null) {
      return text;
    }
  }

  return null;
}

function extractTokenLabels(ast: unknown): Map<string, string> {
  const result = new Map<string, string>();
  if (!isRecord(ast)) {
    return result;
  }

  const tokens = ast.tokens;
  if (isRecord(tokens)) {
    for (const [key, value] of Object.entries(tokens)) {
      if (typeof key !== 'string' || key.trim() === '') {
        continue;
      }
      const label = readLabel(value, ['label', 'text', 'value', 'symbol', 'display']);
      if (label !== null) {
        result.set(key, label);
      }
    }
  }

  return result;
}

function extractNodeLabels(ast: unknown): Map<string, string> {
  const result = new Map<string, string>();
  if (!isRecord(ast)) {
    return result;
  }

  const candidateSources: unknown[] = [];
  if (isRecord(ast.nodes)) {
    candidateSources.push(ast.nodes);
  }
  if (isRecord(ast.byId)) {
    candidateSources.push(ast.byId);
  }

  for (const source of candidateSources) {
    const record = source as Record<string, unknown>;
    for (const [key, value] of Object.entries(record)) {
      if (typeof key !== 'string' || key.trim() === '') {
        continue;
      }
      if (result.has(key)) {
        continue;
      }
      const label = readLabel(value, ['label', 'type', 'kind', 'name']);
      if (label !== null) {
        result.set(key, label);
      }
    }
  }

  return result;
}

function extractParentMap(ast: unknown): Map<string, string> {
  const result = new Map<string, string>();
  if (!isRecord(ast)) {
    return result;
  }

  const parentRaw = ast.parent;
  if (isRecord(parentRaw)) {
    for (const [child, parent] of Object.entries(parentRaw)) {
      if (typeof child !== 'string' || child.trim() === '') {
        continue;
      }
      if (typeof parent !== 'string' || parent.trim() === '' || parent === child) {
        continue;
      }
      result.set(child, parent);
    }
  }

  return result;
}

function collectIds(ast: unknown, parentMap: Map<string, string>): Set<string> {
  const ids = new Set<string>();
  if (isRecord(ast)) {
    if (isRecord(ast.tokens)) {
      Object.keys(ast.tokens).forEach((key) => {
        if (typeof key === 'string' && key.trim() !== '') {
          ids.add(key);
        }
      });
    }
    if (isRecord(ast.nodes)) {
      Object.keys(ast.nodes).forEach((key) => {
        if (typeof key === 'string' && key.trim() !== '') {
          ids.add(key);
        }
      });
    }
    if (isRecord(ast.byId)) {
      Object.keys(ast.byId).forEach((key) => {
        if (typeof key === 'string' && key.trim() !== '') {
          ids.add(key);
        }
      });
    }
    if (Array.isArray(ast.linear)) {
      for (const item of ast.linear as unknown[]) {
        const label = readString(item);
        if (label) {
          ids.add(label);
        }
      }
    }
  }

  for (const [child, parent] of parentMap.entries()) {
    ids.add(child);
    ids.add(parent);
  }

  return ids;
}

function sortIds(ids: Iterable<string>): string[] {
  return Array.from(ids).sort((a, b) => a.localeCompare(b));
}

function buildTraversalOrder(
  ids: Set<string>,
  parentMap: Map<string, string>,
): { order: string[]; edges: GraphJSON['edges'] } {
  const visited = new Set<string>();
  const order: string[] = [];
  const edges: GraphJSON['edges'] = [];
  const children = new Map<string, string[]>();

  for (const [child, parent] of parentMap.entries()) {
    if (!children.has(parent)) {
      children.set(parent, []);
    }
    children.get(parent)!.push(child);
  }

  const visit = (id: string) => {
    if (visited.has(id)) {
      return;
    }
    visited.add(id);
    order.push(id);
    const rawChildren = children.get(id);
    if (rawChildren && rawChildren.length > 0) {
      const sortedChildren = sortIds(rawChildren);
      for (const child of sortedChildren) {
        edges.push({ from: id, to: child });
        visit(child);
      }
    }
  };

  const rootCandidates = sortIds(
    Array.from(ids).filter((id) => {
      const parent = parentMap.get(id);
      if (!parent) {
        return true;
      }
      if (!ids.has(parent)) {
        return true;
      }
      if (parent === id) {
        return true;
      }
      return false;
    }),
  );

  for (const root of rootCandidates) {
    visit(root);
  }

  const remaining = sortIds(Array.from(ids).filter((id) => !visited.has(id)));
  for (const id of remaining) {
    const parent = parentMap.get(id);
    if (parent && ids.has(parent) && !visited.has(parent)) {
      visit(parent);
    }
    visit(id);
  }

  return { order, edges };
}

function buildNodeLabel(
  id: string,
  tokenLabels: Map<string, string>,
  nodeLabels: Map<string, string>,
): string {
  const tokenLabel = tokenLabels.get(id);
  if (tokenLabel) {
    return tokenLabel;
  }
  const nodeLabel = nodeLabels.get(id);
  if (nodeLabel) {
    return nodeLabel;
  }
  return id;
}

export function astToGraph(ast: unknown): GraphJSON | null {
  if (!isRecord(ast)) {
    return null;
  }

  const parentMap = extractParentMap(ast);
  const ids = collectIds(ast, parentMap);
  if (ids.size === 0) {
    return null;
  }

  const tokenLabels = extractTokenLabels(ast);
  const nodeLabels = extractNodeLabels(ast);
  const { order, edges } = buildTraversalOrder(ids, parentMap);

  if (order.length === 0) {
    return null;
  }

  const nodes: GraphJSON['nodes'] = order.map((id) => ({
    id,
    label: buildNodeLabel(id, tokenLabels, nodeLabels),
  }));

  return { nodes, edges };
}

export default astToGraph;
