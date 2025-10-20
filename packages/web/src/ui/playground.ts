import '../styles.css';
import '../styles/viewer.css';

import { createMathSession } from '../math/session';
import type { MathSessionController } from '../math/session';
import { attachMathEngine } from '../math/bridge';
import type { MathBridgeHandle, MathEngine } from '../math/types';
import { createSessionPlayer, type SessionPlayerHandle } from './player';
import type { GraphJSON } from '../api';
import createViewer, { type ViewerHandle } from '../viewer';
import { isIdempotentClick, type IdempotentRelease } from '../util/dom';
import { getRequiredElement } from './dom';
import { createPlaygroundDisplay, type PlaygroundDisplayHandle } from './playgroundDisplay';

interface PlaygroundMountOptions {
  initialExpression?: string;
  onExpressionChange?: (expression: string) => void;
  onInputChange?: (value: string) => void;
}

export interface PlaygroundEngineMeta {
  name?: string | null;
  origin?: string | null;
  version?: string | null;
  source?: 'real' | 'stub' | string | null;
}

export interface PlaygroundHandle {
  destroy(): void;
  loadExpression(expression: string): void;
  getExpression(): string;
  focusInput(): void;
  setEngineMeta(meta: PlaygroundEngineMeta | null): void;
}

function formatEngineMeta(meta: PlaygroundEngineMeta | null): string {
  if (!meta) {
    return 'Engine: unavailable';
  }
  const name = meta.name?.trim() || 'Math engine';
  const origin = meta.origin?.trim() || (meta.source === 'real' ? 'window.RealMathEngine' : 'demo stub');
  const version = meta.version?.trim();
  return version ? `${name} (v${version}) — ${origin}` : `${name} — ${origin}`;
}

function summarizeValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return '""';
    }
    if (trimmed.length > 24) {
      return `"${trimmed.slice(0, 21)}…"`;
    }
    return `"${trimmed}"`;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `Array(${value.length})`;
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>);
    if (keys.length === 0) {
      return '{}';
    }
    return `{${keys.slice(0, 3).join(', ')}${keys.length > 3 ? ', …' : ''}}`;
  }
  return typeof value;
}

function astToGraph(ast: unknown): GraphJSON {
  const nodes: GraphJSON['nodes'] = [];
  const edges: GraphJSON['edges'] = [];
  let counter = 0;

  const visit = (value: unknown, label?: string, parentId?: string): string => {
    const id = `node-${counter += 1}`;
    const summary = summarizeValue(value);
    const nodeLabel = label ? `${label}: ${summary}` : summary;
    nodes.push({ id, label: nodeLabel });

    if (parentId) {
      const edge: GraphJSON['edges'][number] =
        label === undefined ? { from: parentId, to: id } : { from: parentId, to: id, label };
      edges.push(edge);
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        visit(item, `[${index}]`, id);
      });
      return id;
    }

    if (value && typeof value === 'object') {
      Object.entries(value as Record<string, unknown>).forEach(([key, child]) => {
        visit(child, key, id);
      });
      return id;
    }

    return id;
  };

  visit(ast, 'root', undefined);

  return { nodes, edges };
}

export function mountPlayground(
  container: HTMLElement,
  engine: MathEngine,
  options: PlaygroundMountOptions = {},
): PlaygroundHandle {
  const root = container;
  const form = getRequiredElement<HTMLFormElement>(root, '[data-role="math-input-form"]', 'playground');
  const textarea = getRequiredElement<HTMLTextAreaElement>(
    root,
    '[data-role="math-input"]',
    'playground input',
  );
  const actionsContainer = getRequiredElement<HTMLElement>(
    root,
    '[data-role="math-actions"]',
    'playground shell',
  );
  const historyContainer = getRequiredElement<HTMLElement>(
    root,
    '[data-role="math-history"]',
    'playground shell',
  );
  const playerContainer = getRequiredElement<HTMLElement>(
    root,
    '[data-role="math-player"]',
    'playground shell',
  );
  const miniGraphContainer = getRequiredElement<HTMLElement>(
    root,
    '[data-role="math-mini-graph"]',
    'playground shell',
  );
  const miniGraphViewerHost = getRequiredElement<HTMLElement>(
    miniGraphContainer,
    '[data-role="math-mini-graph-viewer"]',
    'mini-graph viewer',
  );
  const miniGraphJson = getRequiredElement<HTMLElement>(
    miniGraphContainer,
    '[data-role="math-mini-graph-json"]',
    'mini-graph viewer',
  );
  const displayContainer = getRequiredElement<HTMLElement>(
    root,
    '[data-role="math-display"]',
    'playground display',
  );
  const catxContainer = getRequiredElement<HTMLElement>(
    displayContainer,
    '[data-role="math-display-catx"]',
    'playground display',
  );
  const fallbackContainer = getRequiredElement<HTMLElement>(
    displayContainer,
    '[data-role="math-display-fallback"]',
    'playground display',
  );
  const hostContainer = getRequiredElement<HTMLElement>(
    fallbackContainer,
    '[data-role="math-display-host"]',
    'playground display',
  );
  const fallbackHtml = getRequiredElement<HTMLElement>(
    fallbackContainer,
    '[data-role="math-display-fallback-html"]',
    'playground display',
  );
  const infoContainer = getRequiredElement<HTMLElement>(
    root,
    '[data-role="math-engine-info"]',
    'playground shell',
  );
  const statusContainer = getRequiredElement<HTMLElement>(
    root,
    '[data-role="math-status"]',
    'playground shell',
  );

  const ownerDocument = root.ownerDocument ?? document;
  const ownerWindow = ownerDocument.defaultView ?? window;

  let destroyed = false;
  let dirtyInput = false;
  let baselineExpression = options.initialExpression?.trim() ?? '';
  let latestExpression = baselineExpression;
  let pendingBaselineUpdate = false;
  let statusTimeout: ReturnType<typeof ownerWindow.setTimeout> | null = null;
  let bridge: MathBridgeHandle | null = null;
  let session: MathSessionController | null = null;
  let player: SessionPlayerHandle | null = null;
  let miniViewer: ViewerHandle | null = null;
  let display: PlaygroundDisplayHandle | null = null;

  const subscriptions: Array<() => void> = [];

  const sessionController = createMathSession();
  session = sessionController;

  display = createPlaygroundDisplay({
    root: displayContainer,
    catxContainer,
    fallbackContainer,
    fallbackHtml,
  });
  void display?.preview(textarea.value);

  const showStatus = (message: string, tone: 'info' | 'error' = 'info', timeoutMs = 3200) => {
    if (destroyed) {
      return;
    }
    statusContainer.textContent = message;
    statusContainer.dataset.tone = tone;
    if (statusTimeout) {
      ownerWindow.clearTimeout(statusTimeout);
    }
    const timeoutHandle = ownerWindow.setTimeout(() => {
      if (statusContainer.dataset.persist === 'true') {
        return;
      }
      statusContainer.textContent = '';
      delete statusContainer.dataset.tone;
      statusTimeout = null;
    }, timeoutMs);
    statusTimeout = timeoutHandle as unknown as ReturnType<typeof ownerWindow.setTimeout>;
  };

  const setEngineMeta = (meta: PlaygroundEngineMeta | null) => {
    infoContainer.textContent = formatEngineMeta(meta);
  };

  const updateMiniGraph = (graph: GraphJSON) => {
    miniGraphJson.textContent = JSON.stringify(graph, null, 2);
    const hostStyle = miniGraphViewerHost.style;
    hostStyle.setProperty('--gv-node-r', 'var(--mg-node-r)');
    hostStyle.setProperty('--gv-edge-stroke', 'var(--mg-edge-stroke)');
    hostStyle.setProperty('--gv-edge-width', 'var(--mg-edge-width)');
    if (!miniViewer) {
      miniViewer = createViewer(miniGraphViewerHost, { initialJSON: miniGraphJson.textContent });
      miniViewer.parse();
      miniViewer.fitToViewBox();
      return;
    }
    const textareaEl = miniGraphViewerHost.querySelector<HTMLTextAreaElement>('textarea[data-role="input"]');
    if (textareaEl) {
      textareaEl.value = miniGraphJson.textContent;
      miniViewer.parse();
      miniViewer.fitToViewBox();
    }
  };

  const readExpressionFromExport = (exported: { tex?: string; ast?: unknown }): string => {
    if (typeof exported.tex === 'string' && exported.tex.trim()) {
      return exported.tex.trim();
    }
    try {
      return JSON.stringify(exported.ast);
    } catch {
      return textarea.value;
    }
  };

  const handleEngineState = (exported: { ast: unknown; html?: string; tex?: string }) => {
    if (destroyed) {
      return;
    }
    latestExpression = readExpressionFromExport(exported);
    options.onExpressionChange?.(latestExpression);
    if (!dirtyInput) {
      textarea.value = exported.tex ?? latestExpression;
    }
    const renderPayload = {
      tex: exported.tex ?? latestExpression,
      plain: latestExpression,
      ast: exported.ast,
      ...(exported.html && exported.html.trim() ? { html: exported.html } : {}),
    };
    void display?.render(renderPayload);
    updateMiniGraph(astToGraph(exported.ast));
    if (pendingBaselineUpdate) {
      baselineExpression = latestExpression;
      pendingBaselineUpdate = false;
    }
  };

  const applyExpression = (expression: string) => {
    void display?.preview(expression);
    if (!bridge) {
      return;
    }
    try {
      bridge.setExpression(expression);
      pendingBaselineUpdate = true;
      sessionController.reset();
      dirtyInput = false;
      textarea.value = expression;
      latestExpression = expression;
      options.onExpressionChange?.(expression);
      options.onInputChange?.(expression);
      void player?.refresh();
      showStatus('Expression parsed', 'info');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showStatus(`Failed to mount expression: ${message}`, 'error');
    }
  };

  const focusInput = () => {
    textarea.focus();
    void display?.preview(textarea.value);
  };

  const handleFormSubmit = (event: Event) => {
    event.preventDefault();
    const submitterCandidate = (event as { submitter?: EventTarget | null }).submitter;
    const submitter = submitterCandidate instanceof HTMLButtonElement ? submitterCandidate : null;
    const release: IdempotentRelease | null = submitter ? isIdempotentClick(submitter) : null;
    try {
      const expression = textarea.value.trim();
      if (!expression) {
        showStatus('Enter an expression to parse', 'error');
        return;
      }
      applyExpression(expression);
    } finally {
      release?.();
    }
  };

  const handleInput = () => {
    dirtyInput = true;
    options.onInputChange?.(textarea.value);
  };

  form.addEventListener('submit', handleFormSubmit);
  textarea.addEventListener('input', handleInput);
  subscriptions.push(() => {
    form.removeEventListener('submit', handleFormSubmit);
    textarea.removeEventListener('input', handleInput);
  });

  const instrumentation = {
    onAction: (actionId: string, _duration: number, outcome: 'ok' | 'err') => {
      if (destroyed || outcome !== 'ok') {
        return;
      }
      sessionController.record(actionId);
      void player?.refresh();
    },
  };

  bridge = attachMathEngine(null, engine, hostContainer, {
    actionsContainer,
    historyContainer,
    toastContainer: root,
    instrumentation,
  });

  player = createSessionPlayer(playerContainer, {
    session: sessionController,
    delayMs: 400,
    apply: (actionId) => {
      engine.apply(actionId);
    },
    onReset: () => {
      if (!bridge) {
        return;
      }
      bridge.setExpression(baselineExpression);
      pendingBaselineUpdate = false;
      dirtyInput = false;
      textarea.value = baselineExpression;
      latestExpression = baselineExpression;
      options.onExpressionChange?.(baselineExpression);
      options.onInputChange?.(baselineExpression);
      void display?.preview(baselineExpression);
    },
  });

  const unsubscribeState = engine.on('state', () => {
    try {
      const exported = engine.export();
      handleEngineState(exported);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showStatus(`Failed to export engine state: ${message}`, 'error');
    }
  });
  subscriptions.push(unsubscribeState);

  if (options.initialExpression?.trim()) {
    textarea.value = options.initialExpression.trim();
    applyExpression(options.initialExpression.trim());
  }

  const getExpression = () => latestExpression;

  const destroy = () => {
    if (destroyed) {
      return;
    }
    destroyed = true;
    subscriptions.forEach((unsubscribe) => {
      try {
        unsubscribe();
      } catch {
        // ignore cleanup errors
      }
    });
    if (statusTimeout) {
      ownerWindow.clearTimeout(statusTimeout);
      statusTimeout = null;
    }
    try {
      bridge?.destroy();
    } catch {
      // ignore destroy errors
    }
    bridge = null;
    try {
      player?.destroy();
    } catch {
      // ignore
    }
    player = null;
    try {
      display?.destroy();
    } catch {
      // ignore
    }
    display = null;
    if (miniViewer) {
      miniViewer.destroy();
      miniViewer = null;
    }
  };

  return {
    destroy,
    loadExpression: applyExpression,
    getExpression,
    focusInput,
    setEngineMeta,
  };
}

export default mountPlayground;
