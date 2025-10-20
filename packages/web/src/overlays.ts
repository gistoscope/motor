import type { GraphAnalysis } from './analysis';
import { edgeKey } from './analysis';

type OverlayName = 'scc' | 'cycles' | 'shortest';

type ToggleMap = Record<OverlayName, HTMLInputElement>;

export interface AnalysisPanelElements {
  hasCycleValue: HTMLElement;
  sccCountValue: HTMLElement;
  cycleEdgeCountValue: HTMLElement;
  warningsList: HTMLElement;
}

export interface ShortestPathOverlayState {
  readonly available: boolean;
  readonly nodes: readonly string[];
  readonly edges: ReadonlyArray<{ from: string; to: string }>;
}

export interface OverlayController {
  setAnalysis(analysis: GraphAnalysis | null | PromiseLike<GraphAnalysis | null>): void;
  setShortestPath(state: ShortestPathOverlayState): void;
  destroy(): void;
}

export interface OverlayOptions {
  svgRoot: HTMLElement;
  toggles: ToggleMap;
  panel: AnalysisPanelElements;
}

type FrameHandle = number;

type PendingOptions = { pending?: boolean };

const canUseRaf =
  typeof requestAnimationFrame === 'function' && typeof cancelAnimationFrame === 'function';
const isHappyDom =
  typeof navigator !== 'undefined' && /HappyDOM/i.test(navigator.userAgent ?? '');
const shouldUseRaf = canUseRaf && !isHappyDom;

const scheduleMicrotask: (callback: () => void) => void =
  typeof queueMicrotask === 'function'
    ? queueMicrotask
    : (callback) => {
        Promise.resolve().then(callback);
      };

function isPromiseLike<T>(value: unknown): value is PromiseLike<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'then' in (value as { then?: unknown }) &&
    typeof (value as { then?: unknown }).then === 'function'
  );
}

function findSccClass(list: DOMTokenList): string | null {
  for (const token of list) {
    if (token.startsWith('motor-scc-')) {
      return token;
    }
  }
  return null;
}

function updateWarnings(list: HTMLElement, analysis: GraphAnalysis | null): void {
  list.innerHTML = '';
  list.dataset.state = analysis ? 'ready' : 'disabled';
  const item = document.createElement('li');
  item.dataset.role = 'analysis-warning-item';
  if (!analysis) {
    item.textContent = 'No data';
  } else if (analysis.hasCycle) {
    item.textContent = 'Cycles detected in the graph.';
  } else {
    item.textContent = 'No warnings';
  }
  list.appendChild(item);
}

function applySccOverlay(svgRoot: HTMLElement, analysis: GraphAnalysis | null, enabled: boolean): void {
  const svg = svgRoot.querySelector('svg');
  if (!svg) return;
  const nodes = svg.querySelectorAll<SVGGElement>('.motor-node');
  nodes.forEach((node) => {
    let existing = findSccClass(node.classList);
    while (existing) {
      node.classList.remove(existing);
      existing = findSccClass(node.classList);
    }
  });

  if (!analysis || !enabled) {
    return;
  }

  nodes.forEach((node) => {
    const nodeId = node.getAttribute('data-node-id');
    if (!nodeId) return;
    const componentIndex = analysis.componentIndex.get(nodeId);
    if (componentIndex === undefined) return;
    node.classList.add(`motor-scc-${componentIndex}`);
  });
}

function applyCycleOverlay(svgRoot: HTMLElement, analysis: GraphAnalysis | null, enabled: boolean): void {
  const svg = svgRoot.querySelector('svg');
  if (!svg) return;
  const edges = svg.querySelectorAll<SVGPathElement>('.motor-edge');
  edges.forEach((edge) => {
    const from = edge.getAttribute('data-from');
    const to = edge.getAttribute('data-to');
    const key = from && to ? edgeKey(from, to) : null;
    const shouldHighlight = Boolean(
      enabled &&
        analysis &&
        key !== null &&
        analysis.cycleEdgeKeys.has(key),
    );
    edge.classList.toggle('motor-edge--cycle', shouldHighlight);
  });
}

function applyShortestOverlay(
  svgRoot: HTMLElement,
  state: ShortestPathOverlayState,
  enabled: boolean,
): void {
  const svg = svgRoot.querySelector('svg');
  if (!svg) return;

  const nodes = svg.querySelectorAll<SVGGElement>('.motor-node');
  const edges = svg.querySelectorAll<SVGPathElement>('.motor-edge');

  nodes.forEach((node) => {
    node.classList.remove('motor-node--path');
  });
  edges.forEach((edge) => {
    edge.classList.remove('motor-edge--path');
  });

  if (!enabled || !state.available || state.nodes.length === 0) {
    return;
  }

  const nodeSet = new Set(state.nodes.map((id) => String(id)));
  nodes.forEach((node) => {
    const nodeId = node.getAttribute('data-node-id');
    if (nodeId && nodeSet.has(nodeId)) {
      node.classList.add('motor-node--path');
    }
  });

  const edgeSet = new Set(state.edges.map(({ from, to }) => edgeKey(String(from), String(to))));
  edges.forEach((edge) => {
    const from = edge.getAttribute('data-from');
    const to = edge.getAttribute('data-to');
    if (from && to && edgeSet.has(edgeKey(from, to))) {
      edge.classList.add('motor-edge--path');
    }
  });
}

export function createOverlayController(options: OverlayOptions): OverlayController {
  let currentAnalysis: GraphAnalysis | null = null;
  let currentShortest: ShortestPathOverlayState = { available: false, nodes: [], edges: [] };
  let frameHandle: FrameHandle | null = null;
  let pendingAnalysisToken = 0;
  let microtaskPending = false;

  const flush = () => {
    applySccOverlay(options.svgRoot, currentAnalysis, options.toggles.scc.checked);
    applyCycleOverlay(options.svgRoot, currentAnalysis, options.toggles.cycles.checked);
    applyShortestOverlay(
      options.svgRoot,
      currentShortest,
      options.toggles.shortest.checked && currentShortest.available,
    );
  };

  const scheduleFlush = () => {
    if (shouldUseRaf) {
      if (frameHandle !== null) {
        return;
      }
      frameHandle = requestAnimationFrame(() => {
        frameHandle = null;
        flush();
      });
      return;
    }

    if (microtaskPending) {
      return;
    }
    microtaskPending = true;
    scheduleMicrotask(() => {
      if (!microtaskPending) {
        return;
      }
      microtaskPending = false;
      flush();
    });
  };

  const cancelFlush = () => {
    if (shouldUseRaf) {
      if (frameHandle !== null) {
        cancelAnimationFrame(frameHandle);
        frameHandle = null;
      }
      return;
    }

    microtaskPending = false;
  };

  const updatePanel = (analysis: GraphAnalysis | null) => {
    const { hasCycleValue, sccCountValue, cycleEdgeCountValue, warningsList } = options.panel;
    if (!analysis) {
      hasCycleValue.textContent = '—';
      sccCountValue.textContent = '—';
      cycleEdgeCountValue.textContent = '—';
      updateWarnings(warningsList, null);
    } else {
      hasCycleValue.textContent = analysis.hasCycle ? 'Yes' : 'No';
      sccCountValue.textContent = String(analysis.sccCount);
      cycleEdgeCountValue.textContent = String(analysis.cycleEdgeCount);
      updateWarnings(warningsList, analysis);
    }
  };

  const applyAnalysisValue = (analysis: GraphAnalysis | null, optionsOverride: PendingOptions = {}) => {
    const pending = Boolean(optionsOverride.pending);
    currentAnalysis = analysis;

    const hasData = Boolean(analysis);
    const sccToggle = options.toggles.scc;
    const cyclesToggle = options.toggles.cycles;
    const shortestToggle = options.toggles.shortest;

    const overlaysEnabled = !pending && hasData;
    sccToggle.disabled = !overlaysEnabled;
    cyclesToggle.disabled = !overlaysEnabled;
    if (!hasData && !pending) {
      sccToggle.checked = false;
      cyclesToggle.checked = false;
    }

    if (pending) {
      shortestToggle.disabled = true;
    } else {
      if (!hasData || !currentShortest.available) {
        shortestToggle.checked = false;
      }
      shortestToggle.disabled = !hasData || !currentShortest.available;
    }

    updatePanel(currentAnalysis);
    scheduleFlush();
  };

  const handleToggleChange = () => {
    scheduleFlush();
  };

  Object.values(options.toggles).forEach((toggle) => {
    toggle.addEventListener('change', handleToggleChange);
  });

  const setAnalysis = (analysis: GraphAnalysis | null | PromiseLike<GraphAnalysis | null>) => {
    const token = ++pendingAnalysisToken;

    if (isPromiseLike<GraphAnalysis | null>(analysis)) {
      applyAnalysisValue(null, { pending: true });
      Promise.resolve(analysis)
        .then((value) => {
          if (token !== pendingAnalysisToken) {
            return;
          }
          applyAnalysisValue(value ?? null);
        })
        .catch(() => {
          if (token !== pendingAnalysisToken) {
            return;
          }
          applyAnalysisValue(null);
        });
      return;
    }

    applyAnalysisValue(analysis);
  };

  const setShortestPath = (state: ShortestPathOverlayState) => {
    currentShortest = {
      available: state.available,
      nodes: state.nodes.map((id) => String(id)),
      edges: state.edges.map((edge) => ({ from: String(edge.from), to: String(edge.to) })),
    };

    if (!currentAnalysis || !currentShortest.available) {
      options.toggles.shortest.checked = false;
    }
    options.toggles.shortest.disabled = !currentAnalysis || !currentShortest.available;

    scheduleFlush();
  };

  const destroy = () => {
    Object.values(options.toggles).forEach((toggle) => {
      toggle.removeEventListener('change', handleToggleChange);
    });
    cancelFlush();
    currentAnalysis = null;
    currentShortest = { available: false, nodes: [], edges: [] };
  };

  setAnalysis(null);

  return {
    setAnalysis,
    setShortestPath,
    destroy,
  };
}
