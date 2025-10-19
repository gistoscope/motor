import type { GraspGraph } from '@motor/grasp';

import {
  analyzeGraphSync,
  computeShortestPathSync,
  edgeKey,
  type EdgeKey,
  type GraphAnalysis,
  type ShortestPathEdge,
  type ShortestPathResult,
} from './analysis-core';
import { FLAGS } from './config';
import type {
  AnalysisWorkerRequest,
  AnalysisWorkerResponse,
} from './worker/analysis.worker';

const WORKER_MODULE_URL = new URL('./worker/analysis.worker.ts', import.meta.url);
const useWorker = FLAGS.workers && typeof Worker !== 'undefined';

interface WorkerHandle {
  readonly worker: Worker;
  readonly pending: Map<number, PendingRequest>;
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

type WorkerTask = AnalysisWorkerRequest['type'];

interface WorkerPayloadMap {
  analyze: { graph: GraspGraph };
  shortest: { graph: GraspGraph; sourceId: string; targetId: string };
}

interface WorkerResultMap {
  analyze: GraphAnalysis;
  shortest: ShortestPathResult | null;
}

let handle: WorkerHandle | null = null;
let workerInit: Promise<WorkerHandle | null> | null = null;
let workerIdCounter = 0;

async function ensureWorker(): Promise<WorkerHandle | null> {
  if (!useWorker) {
    return null;
  }

  if (handle) {
    return handle;
  }

  if (!workerInit) {
    workerInit = createWorker();
  }

  return workerInit;
}

async function createWorker(): Promise<WorkerHandle | null> {
  try {
    const worker = new Worker(WORKER_MODULE_URL, { type: 'module' });
    const pending = new Map<number, PendingRequest>();

    worker.addEventListener('message', (event: MessageEvent<AnalysisWorkerResponse>) => {
      const response = event.data;
      if (!response || typeof response !== 'object' || typeof response.id !== 'number') {
        return;
      }

      const entry = pending.get(response.id);
      if (!entry) {
        return;
      }

      pending.delete(response.id);

      if (response.ok) {
        entry.resolve(response.result);
      } else {
        entry.reject(new Error(response.error));
      }
    });

    worker.addEventListener('error', (event) => {
      pending.forEach((entry) => {
        entry.reject(event instanceof ErrorEvent ? event.error : new Error('Worker error'));
      });
      pending.clear();
      worker.terminate();
      handle = null;
      workerInit = null;
    });

    handle = { worker, pending };
    return handle;
  } catch (err) {
    console.error('Failed to initialize analysis worker', err);
    return null;
  }
}

async function runInWorker<T extends WorkerTask>(
  type: T,
  payload: WorkerPayloadMap[T],
): Promise<WorkerResultMap[T]> {
  const workerHandle = await ensureWorker();
  if (!workerHandle) {
    throw new Error('Worker unavailable');
  }

  const requestId = workerIdCounter + 1;
  workerIdCounter = requestId;
  const message: AnalysisWorkerRequest = {
    id: requestId,
    type,
    ...(payload as Record<string, unknown>),
  } as AnalysisWorkerRequest;

  return new Promise<WorkerResultMap[T]>((resolve, reject) => {
    workerHandle.pending.set(requestId, {
      resolve: (value) => {
        resolve(value as WorkerResultMap[T]);
      },
      reject,
    });
    try {
      workerHandle.worker.postMessage(message);
    } catch (err) {
      workerHandle.pending.delete(requestId);
      reject(err instanceof Error ? err : new Error('Failed to post worker message'));
    }
  });
}

export { edgeKey };
export type { EdgeKey, GraphAnalysis, ShortestPathEdge, ShortestPathResult };

export async function analyzeGraph(graph: GraspGraph): Promise<GraphAnalysis> {
  if (!useWorker) {
    return analyzeGraphSync(graph);
  }

  try {
    return await runInWorker('analyze', { graph });
  } catch (err) {
    return analyzeGraphSync(graph);
  }
}

export function analyzeGraphSyncFallback(graph: GraspGraph): GraphAnalysis {
  return analyzeGraphSync(graph);
}

export async function computeShortestPathAsync(
  graph: GraspGraph,
  sourceId: string,
  targetId: string,
): Promise<ShortestPathResult | null> {
  if (!useWorker) {
    return computeShortestPathSync(graph, sourceId, targetId);
  }

  try {
    return await runInWorker('shortest', { graph, sourceId, targetId });
  } catch (err) {
    return computeShortestPathSync(graph, sourceId, targetId);
  }
}

export function computeShortestPath(
  graph: GraspGraph,
  sourceId: string,
  targetId: string,
): ShortestPathResult | null {
  return computeShortestPathSync(graph, sourceId, targetId);
}
