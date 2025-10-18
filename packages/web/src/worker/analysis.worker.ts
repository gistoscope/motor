import type { GraspGraph } from '@motor/grasp';

import {
  analyzeGraphSync,
  computeShortestPathSync,
  type GraphAnalysis,
  type ShortestPathResult,
} from './analysis.shared';

interface AnalyzeRequest {
  readonly type: 'analyze';
  readonly id: number;
  readonly graph: GraspGraph;
}

interface ShortestRequest {
  readonly type: 'shortest';
  readonly id: number;
  readonly graph: GraspGraph;
  readonly sourceId: string;
  readonly targetId: string;
}

export type AnalysisWorkerRequest = AnalyzeRequest | ShortestRequest;

interface SuccessResponse<T> {
  readonly id: number;
  readonly ok: true;
  readonly result: T;
}

interface ErrorResponse {
  readonly id: number;
  readonly ok: false;
  readonly error: string;
}

export type AnalysisWorkerResponse =
  | SuccessResponse<GraphAnalysis>
  | SuccessResponse<ShortestPathResult | null>
  | ErrorResponse;

type WorkerContext = {
  addEventListener: typeof addEventListener;
  postMessage: (message: AnalysisWorkerResponse) => void;
};

const ctx = self as unknown as WorkerContext;

ctx.addEventListener('message', (event: MessageEvent<AnalysisWorkerRequest>) => {
  const { data } = event;

  if (!data || typeof data !== 'object' || typeof data.id !== 'number') {
    return;
  }

  try {
    switch (data.type) {
      case 'analyze': {
        const result = analyzeGraphSync(data.graph);
        postAnalysisResult(data.id, result);
        return;
      }
      case 'shortest': {
        const result = computeShortestPathSync(data.graph, data.sourceId, data.targetId);
        postShortestResult(data.id, result);
        return;
      }
      default: {
        const request = data as { id: number; type?: unknown };
        postError(request.id, `Unknown worker request type: ${request.type}`);
        return;
      }
    }
  } catch (err) {
    postError(data.id, err instanceof Error ? err.message : 'Unknown worker error');
  }
});

function postAnalysisResult(id: number, result: GraphAnalysis): void {
  const message: AnalysisWorkerResponse = { id, ok: true, result };
  ctx.postMessage(message);
}

function postShortestResult(id: number, result: ShortestPathResult | null): void {
  const message: AnalysisWorkerResponse = { id, ok: true, result };
  ctx.postMessage(message);
}

function postError(id: number, error: string): void {
  const message: AnalysisWorkerResponse = { id, ok: false, error };
  ctx.postMessage(message);
}
