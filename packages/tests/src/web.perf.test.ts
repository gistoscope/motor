import { describe, expect, it } from 'vitest';
import {
  analyzeGraph,
  analyzeGraphSyncFallback,
  computeShortestPath,
  computeShortestPathAsync,
  edgeKey,
} from '../../web/src/analysis';
import { parseGraphJSON, type GraspGraph } from '../../web/src/api';

type StressGraph = {
  graph: GraspGraph;
  edgeCount: number;
  source: string;
  target: string;
};

function createStressGraph(nodeCount: number): StressGraph {
  const nodes = Array.from({ length: nodeCount }, (_, index) => ({ id: `N${index}`, label: `N${index}` }));
  const edges: Array<{ from: string; to: string; weight: number }> = [];

  for (let index = 0; index < nodeCount; index += 1) {
    const from = `N${index}`;
    const to = `N${(index + 1) % nodeCount}`;
    edges.push({ from, to, weight: 1 });
  }

  const longStep = Math.max(2, Math.floor(nodeCount / 3));
  for (let index = 0; index < nodeCount; index += 1) {
    const from = `N${index}`;
    const to = `N${(index + longStep) % nodeCount}`;
    edges.push({ from, to, weight: 2 });
  }

  const parsed = parseGraphJSON({
    nodes,
    edges: edges.map(({ from, to }) => ({ from, to })),
  });
  if (!parsed.ok) {
    throw new Error(parsed.errors.join('\n'));
  }

  const { graph } = parsed;

  const weightEntries = edges.map(({ from, to, weight }) => [edgeKey(from, to), weight] as const);
  (graph as { weights?: ReadonlyMap<string, number> }).weights = new Map(weightEntries);

  const source = 'N0';
  const target = `N${Math.floor(nodeCount / 2)}`;

  return { graph, edgeCount: edges.length, source, target };
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

describe('web performance regressions', () => {
  it('analyzes large graphs without timing out', async () => {
    const { graph, edgeCount, source, target } = createStressGraph(1024);

    const analysis = await withTimeout(analyzeGraph(graph), 2000);
    expect(analysis.nodeCount).toBe(1024);
    expect(analysis.edgeCount).toBe(edgeCount);
    expect(analysis.sccCount).toBe(1);
    expect(analysis.cycleEdgeCount).toBe(edgeCount);

    const syncAnalysis = analyzeGraphSyncFallback(graph);
    expect(syncAnalysis.nodeCount).toBe(analysis.nodeCount);
    expect(syncAnalysis.edgeCount).toBe(analysis.edgeCount);
    expect(syncAnalysis.components).toEqual(analysis.components);

    const asyncShortest = await withTimeout(
      computeShortestPathAsync(graph, source, target),
      2000,
    );
    const syncShortest = computeShortestPath(graph, source, target);
    expect(asyncShortest).toEqual(syncShortest);
    expect(asyncShortest?.nodes.length).toBeGreaterThan(0);
  });
});
