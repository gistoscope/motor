import { describe, expect, it } from 'vitest';
import {
  analyzeGraph,
  analyzeGraphSyncFallback,
  computeShortestPath,
  computeShortestPathAsync,
} from '../../web/src/analysis';
import type { GraphJSON } from '../../web/src/api';

type StressGraph = {
  graph: GraphJSON;
  edgeCount: number;
  source: string;
  target: string;
};

function createStressGraph(nodeCount: number): StressGraph {
  const nodes = Array.from({ length: nodeCount }, (_, index) => ({ id: `N${index}`, label: `N${index}` }));
  const edges: GraphJSON['edges'] = [];

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

  const source = 'N0';
  const target = `N${Math.floor(nodeCount / 2)}`;

  const graph: GraphJSON = { nodes, edges };

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
