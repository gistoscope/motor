import './styles.css';

import {
  fromJSON,
  inspect,
  size,
  toDOT,
  validateGraphJSON,
  edges as listEdges,
  nodes as listNodes,
  type GraspGraph,
} from '@motor/grasp';
import { renderSVG } from './svg';

type ClipboardWriter = {
  writeText(text: string): Promise<void>;
};

export interface ViewerOptions {
  initialJSON?: string;
  clipboard?: ClipboardWriter;
}

export interface ViewerHandle {
  parse(): void;
  destroy(): void;
}

const DASH = '—';

function ensureTrailingNewline(text: string): string {
  return text.endsWith('\n') ? text : `${text}\n`;
}

function resolveClipboard(option?: ClipboardWriter): ClipboardWriter {
  if (option) return option;
  if (typeof navigator !== 'undefined' && navigator?.clipboard?.writeText) {
    return {
      writeText: (text: string) => navigator.clipboard.writeText(text),
    };
  }
  return {
    writeText: () => Promise.reject(new Error('Clipboard API is not available')),
  };
}

function createStatusSetter(el: HTMLElement): (text: string, kind?: 'info' | 'error') => void {
  return (text, kind = 'info') => {
    el.textContent = text;
    el.dataset.kind = kind;
  };
}

interface NodeInfo {
  id: string;
  label: string;
  inDegree: number;
  outDegree: number;
}

interface NodeInfoElements {
  container: HTMLElement;
  idValue: HTMLElement;
  labelValue: HTMLElement;
  inDegreeValue: HTMLElement;
  outDegreeValue: HTMLElement;
}

function resetNodeInfoPanel(elements: NodeInfoElements): void {
  elements.container.dataset.state = 'empty';
  elements.idValue.textContent = DASH;
  elements.labelValue.textContent = DASH;
  elements.inDegreeValue.textContent = DASH;
  elements.outDegreeValue.textContent = DASH;
}

function resetGraphUI(
  nodesEl: HTMLElement,
  edgesEl: HTMLElement,
  listEl: HTMLElement,
  dotEl: HTMLElement,
  inspectEl: HTMLElement,
  svgEl: HTMLElement,
  nodeInfo: NodeInfoElements,
) {
  nodesEl.textContent = DASH;
  edgesEl.textContent = DASH;
  listEl.innerHTML = '';
  const empty = document.createElement('li');
  empty.dataset.role = 'edges-empty';
  empty.textContent = 'No edges';
  listEl.appendChild(empty);
  dotEl.textContent = '';
  inspectEl.textContent = '';
  svgEl.innerHTML = '';
  resetNodeInfoPanel(nodeInfo);
}

function renderGraphUI(
  graph: GraspGraph,
  nodesEl: HTMLElement,
  edgesEl: HTMLElement,
  listEl: HTMLElement,
  dotEl: HTMLElement,
  inspectEl: HTMLElement,
  svgEl: HTMLElement,
  dotText: string,
  inspectText: string,
) {
  const stats = size(graph);
  nodesEl.textContent = String(stats.nodes);
  edgesEl.textContent = String(stats.edges);

  listEl.innerHTML = '';
  const edges = listEdges(graph);
  if (edges.length === 0) {
    const empty = document.createElement('li');
    empty.dataset.role = 'edges-empty';
    empty.textContent = 'No edges';
    listEl.appendChild(empty);
  } else {
    for (const e of edges) {
      const li = document.createElement('li');
      li.dataset.role = 'edge-item';
      li.textContent = `"${String(e.from)}" -> "${String(e.to)}"`;
      listEl.appendChild(li);
    }
  }

  dotEl.textContent = dotText;

  inspectEl.textContent = inspectText;

  renderSVG(svgEl, graph);
}

export function createViewer(root: HTMLElement, options: ViewerOptions = {}): ViewerHandle {
  const clipboard = resolveClipboard(options.clipboard);

  root.innerHTML = `
    <div class="viewer" data-role="viewer-root">
      <section class="viewer__section viewer__section--input">
        <header class="viewer__section-header">
          <h2 class="viewer__title">Graph JSON</h2>
          <div class="viewer__actions">
            <button type="button" class="viewer__button" data-action="parse">Parse</button>
            <button type="button" class="viewer__button viewer__button--secondary" data-action="import">Import</button>
            <button type="button" class="viewer__button viewer__button--secondary" data-action="paste-open">Paste JSON</button>
            <button type="button" class="viewer__button viewer__button--secondary" data-action="download" data-target="json">Download JSON</button>
          </div>
        </header>
        <input type="file" accept=".json,application/json" data-role="import-input" class="viewer__file-input" hidden />
        <textarea class="viewer__textarea" data-role="input" spellcheck="false"></textarea>
        <div class="viewer__errors" data-role="errors" aria-live="polite"></div>
        <div class="viewer__paste" data-role="paste-panel" data-state="hidden" aria-hidden="true">
          <div class="viewer__paste-card">
            <h3 class="viewer__subtitle">Paste Graph JSON</h3>
            <textarea class="viewer__textarea viewer__textarea--paste" data-role="paste-textarea" spellcheck="false"></textarea>
            <div class="viewer__paste-actions">
              <button type="button" class="viewer__button" data-action="paste-apply">Apply</button>
              <button type="button" class="viewer__button viewer__button--secondary" data-action="paste-cancel">Cancel</button>
            </div>
          </div>
        </div>
      </section>
      <section class="viewer__section viewer__section--stats">
        <h2 class="viewer__title">Stats</h2>
        <dl class="viewer__stats">
          <div class="viewer__stat">
            <dt class="viewer__stat-label">Nodes</dt>
            <dd class="viewer__stat-value" data-role="stats-nodes">${DASH}</dd>
          </div>
          <div class="viewer__stat">
            <dt class="viewer__stat-label">Edges</dt>
            <dd class="viewer__stat-value" data-role="stats-edges">${DASH}</dd>
          </div>
        </dl>
        <h3 class="viewer__subtitle">Edges</h3>
        <ul class="viewer__edges" data-role="edges-list"></ul>
      </section>
      <section class="viewer__section viewer__section--preview">
        <h2 class="viewer__title">Preview</h2>
        <div class="viewer__preview" data-role="svg-root" aria-live="polite"></div>
        <aside class="viewer__node-info" data-role="node-info" data-state="empty">
          <h3 class="viewer__subtitle viewer__node-info-title">Node info</h3>
          <dl class="viewer__node-info-list">
            <div class="viewer__node-info-row">
              <dt class="viewer__node-info-label">ID</dt>
              <dd class="viewer__node-info-value" data-role="node-info-id">${DASH}</dd>
            </div>
            <div class="viewer__node-info-row">
              <dt class="viewer__node-info-label">Label</dt>
              <dd class="viewer__node-info-value" data-role="node-info-label">${DASH}</dd>
            </div>
            <div class="viewer__node-info-row">
              <dt class="viewer__node-info-label">In-degree</dt>
              <dd class="viewer__node-info-value" data-role="node-info-in">${DASH}</dd>
            </div>
            <div class="viewer__node-info-row">
              <dt class="viewer__node-info-label">Out-degree</dt>
              <dd class="viewer__node-info-value" data-role="node-info-out">${DASH}</dd>
            </div>
          </dl>
        </aside>
      </section>
      <section class="viewer__section viewer__section--exports">
        <div class="viewer__export">
          <header class="viewer__section-header">
            <h2 class="viewer__title">DOT</h2>
            <div class="viewer__actions">
              <button type="button" class="viewer__button viewer__button--secondary" data-action="download" data-target="dot">Download DOT</button>
              <button type="button" class="viewer__button" data-action="copy" data-target="dot">Copy</button>
            </div>
          </header>
          <pre class="viewer__code" data-role="dot-output"></pre>
        </div>
        <div class="viewer__export">
          <header class="viewer__section-header">
            <h2 class="viewer__title">Inspect</h2>
            <div class="viewer__actions">
              <button type="button" class="viewer__button" data-action="copy" data-target="inspect">Copy</button>
            </div>
          </header>
          <pre class="viewer__code" data-role="inspect-output"></pre>
        </div>
        <p class="viewer__copy-status" data-role="copy-status" aria-live="polite"></p>
      </section>
    </div>
  `;

  const textarea = root.querySelector<HTMLTextAreaElement>('textarea[data-role="input"]');
  const parseButton = root.querySelector<HTMLButtonElement>('button[data-action="parse"]');
  const importButton = root.querySelector<HTMLButtonElement>('button[data-action="import"]');
  const pasteOpenButton = root.querySelector<HTMLButtonElement>('button[data-action="paste-open"]');
  const downloadButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('button[data-action="download"]'));
  const importInput = root.querySelector<HTMLInputElement>('input[data-role="import-input"]');
  const errorsEl = root.querySelector<HTMLElement>('[data-role="errors"]');
  const pastePanel = root.querySelector<HTMLElement>('[data-role="paste-panel"]');
  const pasteTextarea = root.querySelector<HTMLTextAreaElement>('textarea[data-role="paste-textarea"]');
  const pasteApplyButton = root.querySelector<HTMLButtonElement>('button[data-action="paste-apply"]');
  const pasteCancelButton = root.querySelector<HTMLButtonElement>('button[data-action="paste-cancel"]');
  const nodesEl = root.querySelector<HTMLElement>('[data-role="stats-nodes"]');
  const edgesEl = root.querySelector<HTMLElement>('[data-role="stats-edges"]');
  const listEl = root.querySelector<HTMLElement>('[data-role="edges-list"]');
  const dotEl = root.querySelector<HTMLElement>('[data-role="dot-output"]');
  const inspectEl = root.querySelector<HTMLElement>('[data-role="inspect-output"]');
  const statusEl = root.querySelector<HTMLElement>('[data-role="copy-status"]');
  const svgEl = root.querySelector<HTMLElement>('[data-role="svg-root"]');
  const nodeInfoEl = root.querySelector<HTMLElement>('[data-role="node-info"]');
  const nodeInfoIdEl = root.querySelector<HTMLElement>('[data-role="node-info-id"]');
  const nodeInfoLabelEl = root.querySelector<HTMLElement>('[data-role="node-info-label"]');
  const nodeInfoInEl = root.querySelector<HTMLElement>('[data-role="node-info-in"]');
  const nodeInfoOutEl = root.querySelector<HTMLElement>('[data-role="node-info-out"]');
  const copyButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('button[data-action="copy"]'));

  if (
    !textarea ||
    !parseButton ||
    !importButton ||
    !pasteOpenButton ||
    downloadButtons.length === 0 ||
    !importInput ||
    !errorsEl ||
    !pastePanel ||
    !pasteTextarea ||
    !pasteApplyButton ||
    !pasteCancelButton ||
    !nodesEl ||
    !edgesEl ||
    !listEl ||
    !dotEl ||
    !inspectEl ||
    !statusEl ||
    !svgEl ||
    !nodeInfoEl ||
    !nodeInfoIdEl ||
    !nodeInfoLabelEl ||
    !nodeInfoInEl ||
    !nodeInfoOutEl
  ) {
    throw new Error('viewer: missing expected DOM nodes');
  }

  const textareaEl = textarea;
  const parseBtn = parseButton;
  const importBtn = importButton;
  const importInputEl = importInput;
  const pasteBtn = pasteOpenButton;
  const errorsNode = errorsEl;
  const pastePanelEl = pastePanel;
  const pasteTextareaEl = pasteTextarea;
  const pasteApplyBtn = pasteApplyButton;
  const pasteCancelBtn = pasteCancelButton;
  const nodesNode = nodesEl;
  const edgesNode = edgesEl;
  const listNode = listEl;
  const dotNode = dotEl;
  const inspectNode = inspectEl;
  const statusNode = statusEl;
  const svgNode = svgEl;
  const nodeInfoElements: NodeInfoElements = {
    container: nodeInfoEl,
    idValue: nodeInfoIdEl,
    labelValue: nodeInfoLabelEl,
    inDegreeValue: nodeInfoInEl,
    outDegreeValue: nodeInfoOutEl,
  };

  const setStatus = createStatusSetter(statusNode);
  let nodeStats = new Map<string, NodeInfo>();
  let hoveredNodeId: string | null = null;
  let selectedNodeId: string | null = null;
  let currentGraph: GraspGraph | null = null;
  let currentJSONText = '';
  let currentDOTText = '';
  let currentInspectText = '';

  function clearGraphOutputs() {
    currentGraph = null;
    currentJSONText = '';
    currentDOTText = '';
    currentInspectText = '';
  }

    function computeNodeStats(graph: GraspGraph): Map<string, NodeInfo> {
      const stats = new Map<string, NodeInfo>();
      const ids = listNodes(graph);
      ids.forEach((nodeId) => {
        const id = String(nodeId);
        const labelRaw = graph.nodes?.get(nodeId)?.label ?? '';
        const label = typeof labelRaw === 'string' ? labelRaw.trim() : '';
        stats.set(id, {
          id,
          label,
          inDegree: 0,
          outDegree: 0,
        });
      });

      for (const edge of listEdges(graph)) {
        const fromId = String(edge.from);
        const toId = String(edge.to);
        const from = stats.get(fromId);
        if (from) {
          from.outDegree += 1;
        } else {
          stats.set(fromId, {
            id: fromId,
            label: '',
            inDegree: 0,
            outDegree: 1,
          });
        }

        const to = stats.get(toId);
        if (to) {
          to.inDegree += 1;
        } else {
          stats.set(toId, {
            id: toId,
            label: '',
            inDegree: 1,
            outDegree: 0,
          });
        }
      }

      return stats;
    }

    function syncNodeClasses() {
      const svg = svgNode.querySelector('svg');
      if (!svg) return;
      const nodeGroups = svg.querySelectorAll<SVGGElement>('.motor-node');
      nodeGroups.forEach((group) => {
        const nodeId = group.getAttribute('data-node-id');
        const isHovered = hoveredNodeId !== null && nodeId === hoveredNodeId;
        const isSelected = selectedNodeId !== null && nodeId === selectedNodeId;
        group.classList.toggle('motor-node--hover', isHovered);
        group.classList.toggle('motor-node--selected', isSelected);
      });
    }

    function syncEdgeClasses() {
      const svg = svgNode.querySelector('svg');
      if (!svg) return;
      const edges = svg.querySelectorAll<SVGPathElement>('.motor-edge');
      edges.forEach((edge) => {
        const fromId = edge.getAttribute('data-from');
        const toId = edge.getAttribute('data-to');
        const hoverMatch = hoveredNodeId !== null && (fromId === hoveredNodeId || toId === hoveredNodeId);
        const selectedMatch = selectedNodeId !== null && (fromId === selectedNodeId || toId === selectedNodeId);
        edge.classList.toggle('motor-edge--hover', hoverMatch);
        edge.classList.toggle('motor-edge--selected', selectedMatch);
      });
    }

    function updateNodeInfoPanel(nodeId: string | null) {
      if (!nodeId) {
        resetNodeInfoPanel(nodeInfoElements);
        return;
      }

      const info = nodeStats.get(nodeId);
      if (!info) {
        resetNodeInfoPanel(nodeInfoElements);
        return;
      }

      nodeInfoElements.container.dataset.state = 'active';
      nodeInfoElements.idValue.textContent = info.id;
      nodeInfoElements.labelValue.textContent = info.label || DASH;
      nodeInfoElements.inDegreeValue.textContent = String(info.inDegree);
      nodeInfoElements.outDegreeValue.textContent = String(info.outDegree);
    }

    function clearInteractionState() {
      nodeStats = new Map();
      hoveredNodeId = null;
      selectedNodeId = null;
      resetNodeInfoPanel(nodeInfoElements);
      syncNodeClasses();
      syncEdgeClasses();
    }

    function handleHover(nodeId: string | null) {
      if (!nodeId || !nodeStats.has(nodeId)) {
        hoveredNodeId = null;
      } else {
        hoveredNodeId = nodeId;
      }
      syncNodeClasses();
      syncEdgeClasses();
    }

    function handleSelection(nodeId: string | null) {
      if (!nodeId || !nodeStats.has(nodeId)) {
        selectedNodeId = null;
      } else {
        selectedNodeId = nodeId;
      }
      syncNodeClasses();
      syncEdgeClasses();
      updateNodeInfoPanel(selectedNodeId);
    }

  function showErrors(messages: string[]) {
    if (messages.length === 0) {
      errorsNode.textContent = '';
      errorsNode.classList.remove('viewer__errors--visible');
    } else {
      errorsNode.textContent = messages.join('\n');
      errorsNode.classList.add('viewer__errors--visible');
    }
  }

  function processGraphInput(raw: string, options: { updateTextarea: boolean }): boolean {
    setStatus('');
    const trimmed = raw.trim();
    if (!trimmed) {
      showErrors(['Input is empty']);
      resetGraphUI(nodesNode, edgesNode, listNode, dotNode, inspectNode, svgNode, nodeInfoElements);
      clearInteractionState();
      clearGraphOutputs();
      return false;
    }

    let data: unknown;
    try {
      data = JSON.parse(trimmed);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown JSON parse error';
      showErrors([`Invalid JSON: ${msg}`]);
      resetGraphUI(nodesNode, edgesNode, listNode, dotNode, inspectNode, svgNode, nodeInfoElements);
      clearInteractionState();
      clearGraphOutputs();
      return false;
    }

    const validation = validateGraphJSON(data);
    if (!validation.ok) {
      showErrors(validation.errors);
      resetGraphUI(nodesNode, edgesNode, listNode, dotNode, inspectNode, svgNode, nodeInfoElements);
      clearInteractionState();
      clearGraphOutputs();
      return false;
    }

    const graph = fromJSON(data);
    const jsonText = ensureTrailingNewline(JSON.stringify(data, null, 2));
    const dotText = ensureTrailingNewline(toDOT(graph));
    const inspectText = ensureTrailingNewline(inspect(graph));

    if (options.updateTextarea) {
      textareaEl.value = jsonText;
    }

    showErrors([]);
    renderGraphUI(graph, nodesNode, edgesNode, listNode, dotNode, inspectNode, svgNode, dotText, inspectText);
    nodeStats = computeNodeStats(graph);
    hoveredNodeId = null;
    selectedNodeId = null;
    resetNodeInfoPanel(nodeInfoElements);
    syncNodeClasses();
    syncEdgeClasses();

    currentGraph = graph;
    currentJSONText = jsonText;
    currentDOTText = dotText;
    currentInspectText = inspectText;

    return true;
  }

  function parseAndRender() {
    processGraphInput(textareaEl.value, { updateTextarea: true });
  }

  function startDownload(filename: string, content: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const canUseObjectURL = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function';
    const href = canUseObjectURL ? URL.createObjectURL(blob) : `data:${mimeType},${encodeURIComponent(content)}`;
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    if (canUseObjectURL && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(href);
    }
  }

  function handleDownload(ev: Event) {
    const button = ev.currentTarget as HTMLButtonElement | null;
    if (!button) return;
    const target = button.dataset.target;
    let content = '';
    let filename = '';
    let mimeType = 'text/plain;charset=utf-8';
    let label = 'Export';
    if (target === 'json') {
      content = currentJSONText;
      filename = 'graph.json';
      mimeType = 'application/json;charset=utf-8';
      label = 'JSON';
    } else if (target === 'dot') {
      content = currentDOTText;
      filename = 'graph.dot';
      mimeType = 'text/vnd.graphviz;charset=utf-8';
      label = 'DOT';
    } else {
      return;
    }

    if (!content) {
      setStatus(`No ${label} available to download`, 'error');
      return;
    }

    try {
      startDownload(filename, content, mimeType);
      setStatus(`${label} download started.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus(`Download failed: ${message}`, 'error');
    }
  }

  function openPastePanel() {
    pastePanelEl.dataset.state = 'visible';
    pastePanelEl.setAttribute('aria-hidden', 'false');
    pasteTextareaEl.value = '';
    pasteTextareaEl.focus();
  }

  function closePastePanel() {
    pastePanelEl.dataset.state = 'hidden';
    pastePanelEl.setAttribute('aria-hidden', 'true');
    pasteTextareaEl.value = '';
  }

  function handlePasteApply() {
    const ok = processGraphInput(pasteTextareaEl.value, { updateTextarea: true });
    if (ok) {
      closePastePanel();
    }
  }

  function handleImportChange(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }
    const file = files[0];
    file
      .text()
      .then((content) => {
        const ok = processGraphInput(content, { updateTextarea: true });
        if (ok) {
          setStatus('File imported successfully.');
        }
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        showErrors([`Failed to read file: ${message}`]);
        resetGraphUI(nodesNode, edgesNode, listNode, dotNode, inspectNode, svgNode, nodeInfoElements);
        clearInteractionState();
        clearGraphOutputs();
      })
      .finally(() => {
        importInputEl.value = '';
      });
  }

  function handleCopy(ev: Event) {
    const button = ev.currentTarget as HTMLButtonElement | null;
    if (!button) return;
    const target = button.dataset.target;
    const label = target === 'inspect' ? 'Inspect' : 'DOT';
    const raw = target === 'inspect' ? currentInspectText : currentDOTText;
    if (!raw) {
      setStatus(`${label} output is empty`, 'error');
      return;
    }

    Promise.resolve()
      .then(() => clipboard.writeText(raw))
      .then(() => setStatus(`${label} copied to clipboard.`))
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        setStatus(`Copy failed: ${message}`, 'error');
      });
  }

  const handleImportButtonClick = () => importInputEl.click();
  const handleImportInputChange = () => handleImportChange(importInputEl.files);
  const handlePasteCancel = () => closePastePanel();
  const handlePasteKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closePastePanel();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      handlePasteApply();
    }
  };

  parseBtn.addEventListener('click', parseAndRender);
  const handleKeydown = (event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      parseAndRender();
    }
  };
  textareaEl.addEventListener('keydown', handleKeydown);
  importBtn.addEventListener('click', handleImportButtonClick);
  importInputEl.addEventListener('change', handleImportInputChange);
  pasteBtn.addEventListener('click', openPastePanel);
  pasteApplyBtn.addEventListener('click', handlePasteApply);
  pasteCancelBtn.addEventListener('click', handlePasteCancel);
  pasteTextareaEl.addEventListener('keydown', handlePasteKeydown);
  copyButtons.forEach((btn) => btn.addEventListener('click', handleCopy));
  downloadButtons.forEach((btn) => btn.addEventListener('click', handleDownload));
  const handleNodeHoverEvent = (event: Event) => {
    const detail = (event as CustomEvent<{ nodeId: string | null }>).detail;
    handleHover(detail?.nodeId ?? null);
  };
  const handleNodeLeaveEvent = (event: Event) => {
    const detail = (event as CustomEvent<{ nodeId: string | null }>).detail;
    if (!detail?.nodeId || detail.nodeId === hoveredNodeId) {
      handleHover(null);
    }
  };
  const handleNodeSelectEvent = (event: Event) => {
    const detail = (event as CustomEvent<{ nodeId: string | null }>).detail;
    handleSelection(detail?.nodeId ?? null);
  };
  svgNode.addEventListener('motor:node-hover', handleNodeHoverEvent);
  svgNode.addEventListener('motor:node-leave', handleNodeLeaveEvent);
  svgNode.addEventListener('motor:node-select', handleNodeSelectEvent);

  textareaEl.value = options.initialJSON ?? '';
  resetGraphUI(nodesNode, edgesNode, listNode, dotNode, inspectNode, svgNode, nodeInfoElements);
  clearInteractionState();
  if (textareaEl.value.trim()) {
    parseAndRender();
  }

  return {
    parse: parseAndRender,
    destroy: () => {
      parseBtn.removeEventListener('click', parseAndRender);
      textareaEl.removeEventListener('keydown', handleKeydown);
      importBtn.removeEventListener('click', handleImportButtonClick);
      importInputEl.removeEventListener('change', handleImportInputChange);
      pasteBtn.removeEventListener('click', openPastePanel);
      pasteApplyBtn.removeEventListener('click', handlePasteApply);
      pasteCancelBtn.removeEventListener('click', handlePasteCancel);
      pasteTextareaEl.removeEventListener('keydown', handlePasteKeydown);
      copyButtons.forEach((btn) => btn.removeEventListener('click', handleCopy));
      downloadButtons.forEach((btn) => btn.removeEventListener('click', handleDownload));
      svgNode.removeEventListener('motor:node-hover', handleNodeHoverEvent);
      svgNode.removeEventListener('motor:node-leave', handleNodeLeaveEvent);
      svgNode.removeEventListener('motor:node-select', handleNodeSelectEvent);
      root.innerHTML = '';
    },
  };
}

export default createViewer;
