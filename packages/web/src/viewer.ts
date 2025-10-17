import './styles.css';

import {
  fromJSON,
  inspect,
  size,
  toDOT,
  validateGraphJSON,
  edges as listEdges,
  type GraspGraph,
} from '@motor/grasp';

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

function resetGraphUI(
  nodesEl: HTMLElement,
  edgesEl: HTMLElement,
  listEl: HTMLElement,
  dotEl: HTMLElement,
  inspectEl: HTMLElement,
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
}

function renderGraphUI(
  graph: GraspGraph,
  nodesEl: HTMLElement,
  edgesEl: HTMLElement,
  listEl: HTMLElement,
  dotEl: HTMLElement,
  inspectEl: HTMLElement,
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

  const dot = toDOT(graph);
  dotEl.textContent = dot;

  const inspectDump = inspect(graph);
  inspectEl.textContent = inspectDump;
}

export function createViewer(root: HTMLElement, options: ViewerOptions = {}): ViewerHandle {
  const clipboard = resolveClipboard(options.clipboard);

  root.innerHTML = `
    <div class="viewer" data-role="viewer-root">
      <section class="viewer__section viewer__section--input">
        <header class="viewer__section-header">
          <h2 class="viewer__title">Graph JSON</h2>
          <button type="button" class="viewer__button" data-action="parse">Parse</button>
        </header>
        <textarea class="viewer__textarea" data-role="input" spellcheck="false"></textarea>
        <div class="viewer__errors" data-role="errors" aria-live="polite"></div>
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
      <section class="viewer__section viewer__section--exports">
        <div class="viewer__export">
          <header class="viewer__section-header">
            <h2 class="viewer__title">DOT</h2>
            <button type="button" class="viewer__button" data-action="copy" data-target="dot">Copy</button>
          </header>
          <pre class="viewer__code" data-role="dot-output"></pre>
        </div>
        <div class="viewer__export">
          <header class="viewer__section-header">
            <h2 class="viewer__title">Inspect</h2>
            <button type="button" class="viewer__button" data-action="copy" data-target="inspect">Copy</button>
          </header>
          <pre class="viewer__code" data-role="inspect-output"></pre>
        </div>
        <p class="viewer__copy-status" data-role="copy-status" aria-live="polite"></p>
      </section>
    </div>
  `;

  const textarea = root.querySelector<HTMLTextAreaElement>('textarea[data-role="input"]');
  const parseButton = root.querySelector<HTMLButtonElement>('button[data-action="parse"]');
  const errorsEl = root.querySelector<HTMLElement>('[data-role="errors"]');
  const nodesEl = root.querySelector<HTMLElement>('[data-role="stats-nodes"]');
  const edgesEl = root.querySelector<HTMLElement>('[data-role="stats-edges"]');
  const listEl = root.querySelector<HTMLElement>('[data-role="edges-list"]');
  const dotEl = root.querySelector<HTMLElement>('[data-role="dot-output"]');
  const inspectEl = root.querySelector<HTMLElement>('[data-role="inspect-output"]');
  const statusEl = root.querySelector<HTMLElement>('[data-role="copy-status"]');
  const copyButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('button[data-action="copy"]'));

  if (!textarea || !parseButton || !errorsEl || !nodesEl || !edgesEl || !listEl || !dotEl || !inspectEl || !statusEl) {
    throw new Error('viewer: missing expected DOM nodes');
  }

  const textareaEl = textarea;
  const parseBtn = parseButton;
  const errorsNode = errorsEl;
  const nodesNode = nodesEl;
  const edgesNode = edgesEl;
  const listNode = listEl;
  const dotNode = dotEl;
  const inspectNode = inspectEl;
  const statusNode = statusEl;

  const setStatus = createStatusSetter(statusNode);

  function showErrors(messages: string[]) {
    if (messages.length === 0) {
      errorsNode.textContent = '';
      errorsNode.classList.remove('viewer__errors--visible');
    } else {
      errorsNode.textContent = messages.join('\n');
      errorsNode.classList.add('viewer__errors--visible');
    }
  }

  function parseAndRender() {
    setStatus('');
    const raw = textareaEl.value.trim();
    if (!raw) {
      showErrors(['Input is empty']);
      resetGraphUI(nodesNode, edgesNode, listNode, dotNode, inspectNode);
      return;
    }

    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown JSON parse error';
      showErrors([`Invalid JSON: ${msg}`]);
      resetGraphUI(nodesNode, edgesNode, listNode, dotNode, inspectNode);
      return;
    }

    const validation = validateGraphJSON(data);
    if (!validation.ok) {
      showErrors(validation.errors);
      resetGraphUI(nodesNode, edgesNode, listNode, dotNode, inspectNode);
      return;
    }

    const graph = fromJSON(data);
    showErrors([]);
    renderGraphUI(graph, nodesNode, edgesNode, listNode, dotNode, inspectNode);
  }

  function handleCopy(ev: Event) {
    const button = ev.currentTarget as HTMLButtonElement | null;
    if (!button) return;
    const target = button.dataset.target;
    const label = target === 'inspect' ? 'Inspect' : 'DOT';
    const source = target === 'inspect' ? inspectNode : dotNode;
    const raw = source.textContent ?? '';
    if (raw.trim() === '') {
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

  parseBtn.addEventListener('click', parseAndRender);
  const handleKeydown = (event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      parseAndRender();
    }
  };
  textareaEl.addEventListener('keydown', handleKeydown);
  copyButtons.forEach((btn) => btn.addEventListener('click', handleCopy));

  textareaEl.value = options.initialJSON ?? '';
  resetGraphUI(nodesNode, edgesNode, listNode, dotNode, inspectNode);
  if (textareaEl.value.trim()) {
    parseAndRender();
  }

  return {
    parse: parseAndRender,
    destroy: () => {
      parseBtn.removeEventListener('click', parseAndRender);
      textareaEl.removeEventListener('keydown', handleKeydown);
      copyButtons.forEach((btn) => btn.removeEventListener('click', handleCopy));
      root.innerHTML = '';
    },
  };
}

export default createViewer;
