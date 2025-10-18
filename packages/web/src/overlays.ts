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
  setAnalysis(analysis: GraphAnalysis | null): void;
  setShortestPath(state: ShortestPathOverlayState): void;
  destroy(): void;
}

export interface OverlayOptions {
  svgRoot: HTMLElement;
  toggles: ToggleMap;
  panel: AnalysisPanelElements;
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

  const apply = () => {
    applySccOverlay(options.svgRoot, currentAnalysis, options.toggles.scc.checked);
    applyCycleOverlay(options.svgRoot, currentAnalysis, options.toggles.cycles.checked);
    applyShortestOverlay(
      options.svgRoot,
      currentShortest,
      options.toggles.shortest.checked && currentShortest.available,
    );
  };

  const updatePanel = () => {
    const { hasCycleValue, sccCountValue, cycleEdgeCountValue, warningsList } = options.panel;
    if (!currentAnalysis) {
      hasCycleValue.textContent = '—';
      sccCountValue.textContent = '—';
      cycleEdgeCountValue.textContent = '—';
      updateWarnings(warningsList, null);
    } else {
      hasCycleValue.textContent = currentAnalysis.hasCycle ? 'Yes' : 'No';
      sccCountValue.textContent = String(currentAnalysis.sccCount);
      cycleEdgeCountValue.textContent = String(currentAnalysis.cycleEdgeCount);
      updateWarnings(warningsList, currentAnalysis);
    }
  };

  const handleToggleChange = () => {
    apply();
  };

  Object.values(options.toggles).forEach((toggle) => {
    toggle.addEventListener('change', handleToggleChange);
  });

  const setAnalysis = (analysis: GraphAnalysis | null) => {
    currentAnalysis = analysis;
    const hasData = Boolean(analysis);
    options.toggles.scc.disabled = !hasData;
    options.toggles.cycles.disabled = !hasData;
    if (!hasData) {
      options.toggles.scc.checked = false;
      options.toggles.cycles.checked = false;
    }

    const shortestToggle = options.toggles.shortest;
    if (!hasData || !currentShortest.available) {
      shortestToggle.checked = false;
    }
    shortestToggle.disabled = !hasData || !currentShortest.available;

    updatePanel();
    apply();
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

    apply();
  };

  const destroy = () => {
    Object.values(options.toggles).forEach((toggle) => {
      toggle.removeEventListener('change', handleToggleChange);
    });
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
