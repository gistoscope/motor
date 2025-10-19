import {
  fromJSON,
  inspect,
  size,
  toDOT,
  validateGraphJSON,
  type GraspGraph,
} from '@motor/grasp';

import type { GraphJSON } from './types';
import { hasCycleDirected as detectDirectedCycle, shortestPath as computeShortestPath } from './analysis-core';

export type { GraspGraph } from '@motor/grasp';
export type { GraphJSON };

export interface ParseGraphErrorResult {
  readonly ok: false;
  readonly errors: readonly string[];
}

export interface ParseGraphSuccessResult {
  readonly ok: true;
  readonly data: GraphJSON;
  readonly graph: GraspGraph;
}

export type ParseGraphResult = ParseGraphErrorResult | ParseGraphSuccessResult;

export function parseGraphJSON(source: string | GraphJSON): ParseGraphResult {
  let payload: unknown = source;

  if (typeof source === 'string') {
    const trimmed = source.trim();
    if (!trimmed) {
      return { ok: false, errors: ['Input is empty'] };
    }
    try {
      payload = JSON.parse(trimmed);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown JSON parse error';
      return { ok: false, errors: [`Invalid JSON: ${message}`] };
    }
  }

  const validation = validateGraphJSON(payload);
  if (!validation.ok) {
    return { ok: false, errors: [...validation.errors] };
  }

  const data = payload as GraphJSON;
  const graph = fromJSON(data);

  return { ok: true, data, graph };
}

export interface GraphStats {
  readonly nodes: number;
  readonly edges: number;
}

export function computeStats(graph: GraspGraph): GraphStats {
  const { nodes, edges } = size(graph);
  return { nodes, edges };
}

export interface RenderGraphResult {
  readonly dot: string;
  readonly inspect: string;
}

export function renderGraph(graph: GraspGraph): RenderGraphResult {
  return { dot: toDOT(graph), inspect: inspect(graph) };
}

export const shortestPath = computeShortestPath;
export const hasCycleDirected = detectDirectedCycle;
