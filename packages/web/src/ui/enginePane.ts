import { attachMathEngine } from '../math/bridge';
import type { MathBridgeHandle, MathEngine } from '../math/types';
import { isIdempotentClick, type IdempotentRelease } from '../util/dom';
import { getRequiredElement } from './dom';
import { renderWithKatex } from '../engine/katex';
import { findCatxRenderer, renderCatx, type CatxRenderer } from './catx';
import { dispatchGraphEvent, type GraphEventDetail } from '../viewer/bridgeSync';

export interface EnginePaneMeta {
  name?: string | null;
  origin?: string | null;
  version?: string | null;
  source?: 'real' | 'stub' | string | null;
}

export interface EnginePaneOptions {
  initialExpression?: string;
  onExpressionChange?: (expression: string) => void;
  onInputChange?: (value: string) => void;
}

export interface EnginePaneHandle {
  destroy(): void;
  focusInput(): void;
  getExpression(): string;
  setExpression(expression: string): void;
  setEngineMeta(meta: EnginePaneMeta | null): void;
}

function formatMeta(meta: EnginePaneMeta | null): string {
  if (!meta) {
    return 'Engine: unavailable';
  }
  const name = meta.name?.trim() || 'Math engine';
  const origin = meta.origin?.trim() || (meta.source === 'real' ? 'window.RealMathEngine' : 'demo stub');
  const version = meta.version?.trim();
  return version ? `${name} (v${version}) — ${origin}` : `${name} — ${origin}`;
}

export function mountEnginePane(
  root: HTMLElement,
  engine: MathEngine,
  options: EnginePaneOptions = {},
): EnginePaneHandle {
  const ownerDocument = root.ownerDocument ?? document;
  const ownerWindow = ownerDocument.defaultView ?? window;
  const inputEl = getRequiredElement<HTMLInputElement | HTMLTextAreaElement>(
    root,
    '[data-role="engine-input"]',
    'engine pane',
  );
  const displayEl = getRequiredElement<HTMLElement>(root, '[data-role="engine-display"]', 'engine pane');
  const statusEl = root.querySelector<HTMLElement>('[data-role="engine-status"]');
  const infoEl = root.querySelector<HTMLElement>('[data-role="engine-info"]');
  const catxContainer =
    displayEl.querySelector<HTMLElement>('[data-role="engine-display-catx"]') ??
    ownerDocument.createElement('div');
  if (!catxContainer.dataset.role) {
    catxContainer.dataset.role = 'engine-display-catx';
    catxContainer.classList.add('engine-pane__display-catx');
    displayEl.appendChild(catxContainer);
  }
  const fallbackContainer =
    displayEl.querySelector<HTMLElement>('[data-role="engine-display-fallback"]') ??
    ownerDocument.createElement('div');
  if (!fallbackContainer.dataset.role) {
    fallbackContainer.dataset.role = 'engine-display-fallback';
    fallbackContainer.classList.add('engine-pane__display-fallback');
    displayEl.appendChild(fallbackContainer);
  }
  catxContainer.hidden = true;
  fallbackContainer.hidden = true;
  displayEl.dataset.mode = displayEl.dataset.mode ?? 'idle';
  let hostEl = root.querySelector<HTMLElement>('[data-role="engine-host"]');
  if (!hostEl) {
    hostEl = ownerDocument.createElement('div');
    hostEl.dataset.role = 'engine-host';
    hostEl.hidden = true;
    root.appendChild(hostEl);
  }

  const formEl = inputEl.form ?? inputEl.closest('form');
  const applyButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-role="engine-apply"]'));

  let destroyed = false;
  let bridge: MathBridgeHandle | null = null;
  let unsubscribeState: (() => void) | null = null;
  let catxRenderer: CatxRenderer | null = null;
  let renderSequence = 0;
  let latestExpression = options.initialExpression?.trim() || inputEl.value.trim() || '';

  const subscriptions: Array<() => void> = [];

  type InteractionOrigin = 'engine' | 'graph';

  const supportsCssEscape = typeof CSS !== 'undefined' && typeof CSS.escape === 'function';
  const escapeSelector = (value: string): string =>
    supportsCssEscape
      ? CSS.escape(value)
      : value.replace(/([\u0000-\u001f\u007f\s!"#$%&'()*+,./:;<=>?@[\]^`{|}~])/g, '\\$1');

  let katexHoveredNodeId: string | null = null;
  let katexSelectedNodeId: string | null = null;

  const isKatexActive = () => !catxContainer.hidden && displayEl.dataset.mode === 'katex';

  const getNodeElementById = (nodeId: string): HTMLElement | null => {
    if (!isKatexActive()) {
      return null;
    }
    const escaped = escapeSelector(nodeId);
    return (
      catxContainer.querySelector<HTMLElement>(`[data-motor-node-id="${escaped}"]`) ??
      catxContainer.querySelector<HTMLElement>(`#${escaped}`)
    );
  };

  const findNodeElementFromTarget = (target: EventTarget | null): HTMLElement | null => {
    if (!(target instanceof Element)) {
      return null;
    }
    let current: Element | null = target;
    while (current) {
      if (current instanceof HTMLElement) {
        const candidateId = current.dataset.motorNodeId ?? current.id;
        if (typeof candidateId === 'string' && candidateId.trim().startsWith('node-')) {
          return current;
        }
      }
      current = current.parentElement;
    }
    return null;
  };

  const syncKatexNodes = () => {
    if (!isKatexActive()) {
      return;
    }
    const nodes = catxContainer.querySelectorAll<HTMLElement>('[id]');
    nodes.forEach((node) => {
      const id = node.id?.trim();
      if (!id || !id.startsWith('node-')) {
        return;
      }
      node.dataset.motorNodeId = id;
      node.classList.remove('math-token--hovered', 'math-token--selected');
    });

    if (katexHoveredNodeId) {
      const hovered = getNodeElementById(katexHoveredNodeId);
      if (hovered) {
        hovered.classList.add('math-token--hovered');
      } else {
        katexHoveredNodeId = null;
      }
    }

    if (katexSelectedNodeId) {
      const selected = getNodeElementById(katexSelectedNodeId);
      if (selected) {
        selected.classList.add('math-token--selected');
      } else {
        katexSelectedNodeId = null;
      }
    }
  };

  const applyHover = (nodeId: string | null, origin: InteractionOrigin, leaveNodeId?: string | null) => {
    const previous = katexHoveredNodeId;
    if (previous && previous !== nodeId) {
      const prevEl = getNodeElementById(previous);
      prevEl?.classList.remove('math-token--hovered');
    }

    katexHoveredNodeId = nodeId;

    if (nodeId) {
      const nextEl = getNodeElementById(nodeId);
      if (nextEl) {
        nextEl.classList.add('math-token--hovered');
      } else {
        katexHoveredNodeId = null;
      }
    }

    if (origin === 'engine') {
      if (nodeId) {
        dispatchGraphEvent('motor:node-hover', nodeId);
      } else if (leaveNodeId || previous) {
        const fallback = leaveNodeId ?? previous;
        dispatchGraphEvent('motor:node-leave', fallback ?? null);
      }
    }
  };

  const applySelection = (nodeId: string | null, origin: InteractionOrigin) => {
    if (katexSelectedNodeId && katexSelectedNodeId !== nodeId) {
      const prevEl = getNodeElementById(katexSelectedNodeId);
      prevEl?.classList.remove('math-token--selected');
    }

    katexSelectedNodeId = nodeId;

    if (nodeId) {
      const nextEl = getNodeElementById(nodeId);
      if (nextEl) {
        nextEl.classList.add('math-token--selected');
      } else {
        katexSelectedNodeId = null;
      }
    }

    if (origin === 'engine') {
      dispatchGraphEvent('motor:node-select', nodeId);
    }
  };

  const handlePointerOver = (event: PointerEvent) => {
    if (displayEl.dataset.mode !== 'katex') {
      return;
    }
    const nodeElement = findNodeElementFromTarget(event.target);
    const nodeId = nodeElement?.dataset.motorNodeId ?? nodeElement?.id ?? null;
    if (!nodeId) {
      return;
    }
    if (katexHoveredNodeId === nodeId) {
      return;
    }
    applyHover(nodeId, 'engine');
  };

  const handlePointerOut = (event: PointerEvent) => {
    if (displayEl.dataset.mode !== 'katex') {
      return;
    }
    const nodeElement = findNodeElementFromTarget(event.target);
    if (!nodeElement) {
      return;
    }
    const related = event.relatedTarget as Element | null;
    if (related && nodeElement.contains(related)) {
      return;
    }
    const nodeId = nodeElement.dataset.motorNodeId ?? nodeElement.id ?? null;
    if (!nodeId) {
      return;
    }
    applyHover(null, 'engine', nodeId);
  };

  const handlePointerLeave = () => {
    if (displayEl.dataset.mode !== 'katex') {
      return;
    }
    if (!katexHoveredNodeId) {
      return;
    }
    const previous = katexHoveredNodeId;
    applyHover(null, 'engine', previous);
  };

  const handleNodeClick = (event: MouseEvent) => {
    if (displayEl.dataset.mode !== 'katex') {
      return;
    }
    const nodeElement = findNodeElementFromTarget(event.target);
    const nodeId = nodeElement?.dataset.motorNodeId ?? nodeElement?.id ?? null;
    if (!nodeId) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const nextSelection = katexSelectedNodeId === nodeId ? null : nodeId;
    applySelection(nextSelection, 'engine');
  };

  catxContainer.addEventListener('pointerover', handlePointerOver);
  catxContainer.addEventListener('pointerout', handlePointerOut);
  catxContainer.addEventListener('pointerleave', handlePointerLeave);
  catxContainer.addEventListener('click', handleNodeClick);
  subscriptions.push(() => {
    catxContainer.removeEventListener('pointerover', handlePointerOver);
    catxContainer.removeEventListener('pointerout', handlePointerOut);
    catxContainer.removeEventListener('pointerleave', handlePointerLeave);
    catxContainer.removeEventListener('click', handleNodeClick);
  });

  const handleGraphHoverEvent = (event: Event) => {
    const detail = (event as CustomEvent<GraphEventDetail | undefined>).detail;
    if (detail?.source === 'engine') {
      return;
    }
    const nodeId = detail?.nodeId ?? null;
    if (nodeId) {
      applyHover(nodeId, 'graph');
    } else {
      applyHover(null, 'graph');
    }
  };

  const handleGraphLeaveEvent = (event: Event) => {
    const detail = (event as CustomEvent<GraphEventDetail | undefined>).detail;
    if (detail?.source === 'engine') {
      return;
    }
    const nodeId = detail?.nodeId ?? null;
    if (!nodeId || nodeId === katexHoveredNodeId) {
      applyHover(null, 'graph');
    }
  };

  const handleGraphSelectEvent = (event: Event) => {
    const detail = (event as CustomEvent<GraphEventDetail | undefined>).detail;
    if (detail?.source === 'engine') {
      return;
    }
    const nodeId = detail?.nodeId ?? null;
    applySelection(nodeId, 'graph');
  };

  if (typeof document !== 'undefined') {
    document.addEventListener('motor:node-hover', handleGraphHoverEvent as EventListener);
    document.addEventListener('motor:node-leave', handleGraphLeaveEvent as EventListener);
    document.addEventListener('motor:node-select', handleGraphSelectEvent as EventListener);
    subscriptions.push(() => {
      document.removeEventListener('motor:node-hover', handleGraphHoverEvent as EventListener);
      document.removeEventListener('motor:node-leave', handleGraphLeaveEvent as EventListener);
      document.removeEventListener('motor:node-select', handleGraphSelectEvent as EventListener);
    });
  }

  const setStatus = (message: string, tone: 'info' | 'error' = 'info') => {
    if (!statusEl) {
      return;
    }
    statusEl.textContent = message;
    statusEl.dataset.tone = tone;
  };

  const clearStatus = () => {
    if (!statusEl) {
      return;
    }
    statusEl.textContent = '';
    delete statusEl.dataset.tone;
  };

  const setEngineMeta = (meta: EnginePaneMeta | null) => {
    if (infoEl) {
      infoEl.textContent = formatMeta(meta);
    }
  };

  const ensureCatxRenderer = (): CatxRenderer | null => {
    if (!catxRenderer) {
      catxRenderer = findCatxRenderer(ownerWindow);
    }
    return catxRenderer;
  };

  const renderFallback = (expression: string, htmlOutput: string | null) => {
    fallbackContainer.innerHTML = '';
    fallbackContainer.hidden = false;
    catxContainer.hidden = true;
    if (htmlOutput && htmlOutput.trim()) {
      fallbackContainer.innerHTML = htmlOutput;
      displayEl.dataset.mode = 'html';
      setStatus('Showing engine HTML output', 'info');
      return;
    }
    if (expression.trim()) {
      const pre = ownerDocument.createElement('pre');
      pre.className = 'engine-pane__fallback-tex';
      pre.textContent = expression;
      fallbackContainer.appendChild(pre);
      displayEl.dataset.mode = 'tex';
      setStatus('Showing expression text output', 'info');
      return;
    }
    fallbackContainer.textContent = 'Engine produced no output.';
    displayEl.dataset.mode = 'empty';
    setStatus('Engine produced no output', 'error');
  };

  const renderEngineState = async (exported: { ast: unknown; html?: string; tex?: string }) => {
    if (destroyed) {
      return;
    }
    const sequence = ++renderSequence;
    const tex = typeof exported.tex === 'string' && exported.tex.trim().length > 0 ? exported.tex : latestExpression;
    const htmlOutput = typeof exported.html === 'string' ? exported.html : null;
    const renderer = ensureCatxRenderer();

    if (renderer && tex.trim()) {
      catxContainer.innerHTML = '';
      fallbackContainer.hidden = true;
      try {
        const success = await renderCatx(renderer, { tex, ast: exported.ast, target: catxContainer });
        if (destroyed || sequence !== renderSequence) {
          return;
        }
        if (success && (catxContainer.childElementCount > 0 || catxContainer.textContent?.trim())) {
          catxContainer.hidden = false;
          fallbackContainer.hidden = true;
          fallbackContainer.innerHTML = '';
          displayEl.dataset.mode = 'catx';
          setStatus('Rendered with CATX', 'info');
          return;
        }
      } catch (error) {
        console.warn('[engine-pane] CATX render failed', error);
      }
    }

    if (destroyed || sequence !== renderSequence) {
      return;
    }

    if (tex.trim()) {
      catxContainer.innerHTML = '';
      try {
        const katexSuccess = await renderWithKatex(tex, catxContainer, {
          throwOnError: false,
          trustHtml: true,
        });
        if (destroyed || sequence !== renderSequence) {
          return;
        }
        if (katexSuccess && (catxContainer.childElementCount > 0 || catxContainer.textContent?.trim())) {
          catxContainer.hidden = false;
          fallbackContainer.hidden = true;
          fallbackContainer.innerHTML = '';
          displayEl.dataset.mode = 'katex';
          syncKatexNodes();
          setStatus('Rendered with KaTeX', 'info');
          return;
        }
      } catch (error) {
        console.warn('[engine-pane] KaTeX render failed', error);
      }
    }

    if (destroyed || sequence !== renderSequence) {
      return;
    }

    renderFallback(tex, htmlOutput);
  };

  const applyExpression = (expression: string) => {
    const trimmed = expression.trim();
    if (!trimmed) {
      setStatus('Enter an expression to render', 'error');
      return;
    }
    if (!bridge) {
      setStatus('Engine is not ready', 'error');
      return;
    }
    try {
      bridge.setExpression(trimmed);
      latestExpression = trimmed;
      options.onExpressionChange?.(trimmed);
      clearStatus();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus(`Failed to render expression: ${message}`, 'error');
    }
  };

  const handleSubmit = (event: Event) => {
    event.preventDefault();
    const submitterCandidate = (event as { submitter?: EventTarget | null }).submitter;
    const submitter = submitterCandidate instanceof HTMLButtonElement ? submitterCandidate : null;
    const release: IdempotentRelease | null = submitter ? isIdempotentClick(submitter) : null;
    try {
      applyExpression(inputEl.value);
    } finally {
      release?.();
    }
  };

  const handleApplyClick = (event: Event) => {
    event.preventDefault();
    const button = event.currentTarget as HTMLButtonElement | null;
    const release: IdempotentRelease | null = button ? isIdempotentClick(button) : null;
    try {
      applyExpression(inputEl.value);
    } finally {
      release?.();
    }
  };

  const handleInput = () => {
    options.onInputChange?.(inputEl.value);
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      applyExpression(inputEl.value);
    }
  };

  inputEl.addEventListener('input', handleInput);
  inputEl.addEventListener('keydown', handleKeydown);
  subscriptions.push(() => {
    inputEl.removeEventListener('input', handleInput);
    inputEl.removeEventListener('keydown', handleKeydown);
  });

  if (formEl instanceof HTMLFormElement) {
    formEl.addEventListener('submit', handleSubmit);
    subscriptions.push(() => {
      formEl.removeEventListener('submit', handleSubmit);
    });
  } else if (applyButtons.length === 0) {
    // Fallback: apply on blur if no submit mechanism exists.
    const handleBlur = () => {
      applyExpression(inputEl.value);
    };
    inputEl.addEventListener('blur', handleBlur);
    subscriptions.push(() => {
      inputEl.removeEventListener('blur', handleBlur);
    });
  }

  applyButtons.forEach((button) => {
    button.addEventListener('click', handleApplyClick);
    subscriptions.push(() => {
      button.removeEventListener('click', handleApplyClick);
    });
  });

  try {
    bridge = attachMathEngine(null, engine, hostEl, {
      initialExpression: latestExpression,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setStatus(`Failed to initialize engine: ${message}`, 'error');
    throw error;
  }

  if (latestExpression && !inputEl.value.trim()) {
    inputEl.value = latestExpression;
  }

  try {
    unsubscribeState = engine.on('state', () => {
      try {
        const exported = engine.export();
        void renderEngineState(exported);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setStatus(`Failed to export engine state: ${message}`, 'error');
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setStatus(`Failed to subscribe to engine events: ${message}`, 'error');
  }

  try {
    const exported = engine.export();
    void renderEngineState(exported);
  } catch (error) {
    console.warn('[engine-pane] initial export failed', error);
  }

  const destroy = () => {
    if (destroyed) {
      return;
    }
    destroyed = true;
    subscriptions.forEach((unsubscribe) => {
      try {
        unsubscribe();
      } catch {
        // ignore teardown errors
      }
    });
    subscriptions.length = 0;
    if (unsubscribeState) {
      try {
        unsubscribeState();
      } catch {
        // ignore unsubscribe errors
      }
      unsubscribeState = null;
    }
    if (bridge) {
      try {
        bridge.destroy();
      } catch {
        // ignore destroy errors
      }
      bridge = null;
    }
    catxContainer.innerHTML = '';
    fallbackContainer.innerHTML = '';
  };

  return {
    destroy,
    focusInput() {
      inputEl.focus();
    },
    getExpression() {
      return latestExpression;
    },
    setExpression(expression: string) {
      inputEl.value = expression;
      applyExpression(expression);
    },
    setEngineMeta,
  };
}
