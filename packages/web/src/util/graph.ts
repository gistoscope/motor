import type { GraphJSON } from '../api';

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isNonNegativeWeights(graph: GraphJSON | null | undefined): boolean {
  if (!graph || typeof graph !== 'object') {
    return false;
  }

  const edges = Array.isArray(graph.edges) ? graph.edges : [];
  if (edges.length === 0) {
    return false;
  }

  for (const entry of edges) {
    if (!entry || typeof entry !== 'object') {
      return false;
    }

    const from = (entry as { from?: unknown }).from;
    const to = (entry as { to?: unknown }).to;
    const weight = (entry as { weight?: unknown }).weight;

    if (typeof from !== 'string' || typeof to !== 'string') {
      return false;
    }

    if (!isFiniteNumber(weight) || weight < 0) {
      return false;
    }
  }

  return true;
}
