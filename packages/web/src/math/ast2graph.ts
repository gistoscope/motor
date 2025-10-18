import type { GraphJSON } from '@motor/grasp';

export interface AstGraphDetail {
  graph: GraphJSON;
  nodeTokens: Record<string, string[]>;
  tokenNodes: Record<string, string[]>;
  roots: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function collectStringArray(value: unknown): string[] {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    const result: string[] = [];
    for (const entry of value) {
      const normalized = normalizeString(entry);
      if (normalized) {
        result.push(normalized);
      }
    }
    return result;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return [String(value)];
  }
  if (isRecord(value)) {
    const record = value as Record<string, unknown>;
    const directKeys = ['list', 'items', 'values', 'tokens', 'span'];
    for (const key of directKeys) {
      if (key in record) {
        return collectStringArray(record[key]);
      }
    }
  }
  return [];
}

function compareIds(a: string, b: string): number {
  return a.localeCompare(b);
}

function sortUnique(values: Iterable<string>): string[] {
  return Array.from(new Set(values)).sort(compareIds);
}

function toRecordOfSortedArrays(map: Map<string, Set<string>>): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  const keys = Array.from(map.keys()).sort(compareIds);
  for (const key of keys) {
    const tokens = map.get(key);
    if (!tokens || tokens.size === 0) {
      continue;
    }
    result[key] = sortUnique(tokens);
  }
  return result;
}

export function astToGraph(ast: unknown): AstGraphDetail {
  const nodesSet = new Set<string>();
  const edgesSet = new Set<string>();
  const parentMap = new Map<string, string>();
  const nodeTokensMap = new Map<string, Set<string>>();
  const tokenNodesMap = new Map<string, Set<string>>();
  const seenTokens = new Set<string>();

  const addNodeId = (value: unknown) => {
    const normalized = normalizeString(value);
    if (!normalized) {
      return;
    }
    nodesSet.add(normalized);
  };

  const addEdge = (parentId: string, childId: string) => {
    if (parentId === childId) {
      return;
    }
    if (!nodesSet.has(parentId) || !nodesSet.has(childId)) {
      return;
    }
    const key = `${parentId}\u2192${childId}`;
    if (edgesSet.has(key)) {
      return;
    }
    edgesSet.add(key);
  };

  const addNodeTokens = (nodeId: string, tokens: Iterable<string>) => {
    let bucket = nodeTokensMap.get(nodeId);
    if (!bucket) {
      bucket = new Set<string>();
      nodeTokensMap.set(nodeId, bucket);
    }
    for (const tokenId of tokens) {
      const normalized = normalizeString(tokenId);
      if (!normalized) {
        continue;
      }
      bucket.add(normalized);
      let inverse = tokenNodesMap.get(normalized);
      if (!inverse) {
        inverse = new Set<string>();
        tokenNodesMap.set(normalized, inverse);
      }
      inverse.add(nodeId);
    }
  };

  if (isRecord(ast)) {
    const record = ast as Record<string, unknown>;
    const linear = Array.isArray(record.linear) ? record.linear : [];
    for (const entry of linear) {
      addNodeId(entry);
    }

    const tokensRecord = isRecord(record.tokens) ? (record.tokens as Record<string, unknown>) : {};
    for (const key of Object.keys(tokensRecord)) {
      addNodeId(key);
      addNodeTokens(key, [key]);
      seenTokens.add(key);
    }

    const nodesRecord = isRecord(record.nodes) ? (record.nodes as Record<string, unknown>) : {};
    for (const key of Object.keys(nodesRecord)) {
      addNodeId(key);
      const info = nodesRecord[key];
      if (isRecord(info)) {
        const span = collectStringArray((info as Record<string, unknown>).span);
        if (span.length > 0) {
          addNodeTokens(key, span);
        }
      }
    }

    const byIdRecord = isRecord(record.byId) ? (record.byId as Record<string, unknown>) : {};
    for (const key of Object.keys(byIdRecord)) {
      addNodeId(key);
    }

    const ownerRecord = isRecord(record.owner) ? (record.owner as Record<string, unknown>) : {};
    for (const [child, owner] of Object.entries(ownerRecord)) {
      addNodeId(child);
      addNodeId(owner);
      const ownerId = normalizeString(owner);
      if (ownerId && ownerId !== child) {
        if (!parentMap.has(child)) {
          parentMap.set(child, ownerId);
        }
        addNodeTokens(ownerId, [child]);
      }
    }

    const parentRecord = isRecord(record.parent) ? (record.parent as Record<string, unknown>) : {};
    for (const [child, parent] of Object.entries(parentRecord)) {
      addNodeId(child);
      const parentId = normalizeString(parent);
      if (parentId) {
        addNodeId(parentId);
        parentMap.set(child, parentId);
        if (seenTokens.has(child)) {
          addNodeTokens(parentId, [child]);
        }
      }
    }

    const pairsRecord = isRecord(record.pairs) ? (record.pairs as Record<string, unknown>) : {};
    for (const [nodeId, tokens] of Object.entries(pairsRecord)) {
      addNodeId(nodeId);
      const list = collectStringArray(tokens);
      if (list.length > 0) {
        addNodeTokens(nodeId, list);
      }
    }

    const rootCandidate = normalizeString(record.root);
    if (rootCandidate) {
      addNodeId(rootCandidate);
    }

    const extraKeys = ['children', 'nodes', 'body'];
    for (const key of extraKeys) {
      if (!record[key]) {
        continue;
      }
      const entries = collectStringArray(record[key]);
      for (const entry of entries) {
        addNodeId(entry);
      }
    }

    for (const [child, parent] of parentMap.entries()) {
      addEdge(parent, child);
    }

    for (const [child, parent] of Object.entries(ownerRecord)) {
      const parentId = normalizeString(parent);
      if (parentId && parentId !== child) {
        addEdge(parentId, child);
      }
    }
  }

  const nodeIds = Array.from(nodesSet).sort(compareIds);

  const graphNodes: GraphJSON['nodes'] = nodeIds.map((id) => ({
    id,
    label: extractLabel(ast, id),
  }));

  const edges: GraphJSON['edges'] = Array.from(edgesSet)
    .map((key) => {
      const [from, to] = key.split('\u2192');
      return { from, to };
    })
    .sort((a, b) => {
      const byFrom = compareIds(a.from, b.from);
      if (byFrom !== 0) {
        return byFrom;
      }
      return compareIds(a.to, b.to);
    });

  const nodeTokens = toRecordOfSortedArrays(nodeTokensMap);
  const tokenNodes = toRecordOfSortedArrays(tokenNodesMap);

  const roots = nodeIds.filter((id) => {
    const parentId = parentMap.get(id);
    if (!parentId) {
      return true;
    }
    if (!nodesSet.has(parentId)) {
      return true;
    }
    return parentId === id;
  });

  const graph: GraphJSON = {
    nodes: graphNodes,
    edges,
  };

  return { graph, nodeTokens, tokenNodes, roots: roots.sort(compareIds) };
}

function extractLabel(source: unknown, id: string): string {
  if (!isRecord(source)) {
    return id;
  }
  const record = source as Record<string, unknown>;

  const tokensRecord = isRecord(record.tokens) ? (record.tokens as Record<string, unknown>) : null;
  if (tokensRecord && isRecord(tokensRecord[id])) {
    const tokenRecord = tokensRecord[id] as Record<string, unknown>;
    const tokenKeys = ['text', 'value', 'label', 'content'];
    for (const key of tokenKeys) {
      const candidate = normalizeString(tokenRecord[key]);
      if (candidate) {
        return candidate;
      }
    }
    if (typeof tokenRecord.kind === 'string') {
      return tokenRecord.kind;
    }
  }

  const nodesRecord = isRecord(record.nodes) ? (record.nodes as Record<string, unknown>) : null;
  if (nodesRecord && isRecord(nodesRecord[id])) {
    const nodeRecord = nodesRecord[id] as Record<string, unknown>;
    const nodeKeys = ['label', 'type', 'kind', 'name'];
    for (const key of nodeKeys) {
      const candidate = normalizeString(nodeRecord[key]);
      if (candidate) {
        return candidate;
      }
    }
  }

  const byIdRecord = isRecord(record.byId) ? (record.byId as Record<string, unknown>) : null;
  if (byIdRecord && isRecord(byIdRecord[id])) {
    const info = byIdRecord[id] as Record<string, unknown>;
    const nodeKeys = ['label', 'type', 'kind', 'name'];
    for (const key of nodeKeys) {
      const candidate = normalizeString(info[key]);
      if (candidate) {
        return candidate;
      }
    }
  }

  return id;
}
