import createViewer, { initMath } from '../src/viewer.js';
import {
  decodeViewerStateFromSearch,
  encodeViewerStateToUrl,
  DEFAULT_VIEWER_URL_STATE,
} from '../src/util/state-url.js';

const GRAPH_EXAMPLES = [
  {
    id: 'triangle',
    label: 'Triangle',
    data: {
      nodes: [
        { id: 'A', label: 'Alpha' },
        { id: 'B', label: 'Beta' },
        { id: 'C', label: 'Gamma' },
      ],
      edges: [
        { from: 'A', to: 'B' },
        { from: 'B', to: 'C' },
        { from: 'C', to: 'A' },
      ],
    },
  },
  {
    id: 'diamond',
    label: 'Diamond',
    data: {
      nodes: [
        { id: 'Start', label: 'Start' },
        { id: 'Left', label: 'Left branch' },
        { id: 'Right', label: 'Right branch' },
        { id: 'Merge', label: 'Merge' },
      ],
      edges: [
        { from: 'Start', to: 'Left' },
        { from: 'Start', to: 'Right' },
        { from: 'Left', to: 'Merge' },
        { from: 'Right', to: 'Merge' },
      ],
    },
  },
];

const EXPRESSIONS = [
  { id: 'expr-0', label: '2 + 3', expression: '2+3' },
  { id: 'expr-1', label: '3x + 2x', expression: '3x+2x' },
  { id: 'expr-2', label: '(a + b) / c', expression: '(a+b)/c' },
];

function formatGraphJSON(example) {
  return JSON.stringify(example.data, null, 2);
}

function getViewerTextarea(root) {
  return root.querySelector('textarea[data-role="input"]');
}

const OVERLAY_KEYS = ['scc', 'cycles', 'shortest'];

function getOverlayStateFromViewer(root) {
  const state = { scc: false, cycles: false, shortest: false };
  const inputs = root.querySelectorAll('input[data-role="overlay-toggle"]');
  inputs.forEach((input) => {
    const name = input.dataset.overlay;
    if (name && OVERLAY_KEYS.includes(name)) {
      state[name] = input.checked;
    }
  });
  return state;
}

function applyOverlayStateToViewer(root, overlays) {
  const inputs = root.querySelectorAll('input[data-role="overlay-toggle"]');
  inputs.forEach((input) => {
    const name = input.dataset.overlay;
    if (!name || !OVERLAY_KEYS.includes(name)) {
      return;
    }
    const shouldCheck = Boolean(overlays?.[name]);
    if (input.checked !== shouldCheck) {
      input.checked = shouldCheck;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
}

function parseScaleValue(value) {
  if (value == null) {
    return null;
  }
  const parsed = Number.parseFloat(String(value).trim());
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function parseScaleFromTransform(transform) {
  if (!transform || transform === 'none') {
    return null;
  }

  const scaleMatch = transform.match(/scale\(([^)]+)\)/iu);
  if (scaleMatch) {
    const parts = scaleMatch[1]
      .split(',')
      .map((part) => parseScaleValue(part))
      .filter((value) => value != null);
    if (parts.length === 1) {
      return parts[0];
    }
    if (parts.length >= 2 && Math.abs(parts[0] - parts[1]) < 1e-6) {
      return parts[0];
    }
  }

  const matrixMatch = transform.match(/matrix\(([^)]+)\)/iu);
  if (matrixMatch) {
    const values = matrixMatch[1]
      .split(',')
      .map((part) => Number.parseFloat(part.trim()))
      .filter((value) => Number.isFinite(value));
    if (values.length >= 4) {
      const [a, b, c, d] = values;
      const scaleX = Math.hypot(a, b);
      const scaleY = Math.hypot(c, d);
      if (scaleX > 0 && Math.abs(scaleX - scaleY) < 1e-6) {
        return Math.round(scaleX * 1000) / 1000;
      }
    }
  }

  return null;
}

function readScaleFromElement(element) {
  if (!element) {
    return null;
  }

  const directAttr = element.getAttribute('data-scale');
  const datasetValue = parseScaleValue(directAttr ?? element.dataset?.scale);
  if (datasetValue != null) {
    return datasetValue;
  }

  const inlineScale =
    parseScaleValue(element.style?.getPropertyValue?.('--motor-graph-scale')) ??
    parseScaleValue(element.style?.getPropertyValue?.('--motor-scale'));
  if (inlineScale != null) {
    return inlineScale;
  }

  if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
    const computed = window.getComputedStyle(element);
    const computedScale =
      parseScaleValue(computed.getPropertyValue('--motor-graph-scale')) ??
      parseScaleValue(computed.getPropertyValue('--motor-scale'));
    if (computedScale != null) {
      return computedScale;
    }
    const transformScale = parseScaleFromTransform(computed.transform || computed.webkitTransform);
    if (transformScale != null) {
      return transformScale;
    }
  }

  return null;
}

function getViewerScale(root) {
  const svgRoot = root.querySelector('[data-role="svg-root"]');
  const viewerRoot = root.querySelector('[data-role="viewer-root"]');
  return (
    readScaleFromElement(svgRoot) ??
    readScaleFromElement(viewerRoot) ??
    parseScaleValue(root.dataset?.scale) ??
    DEFAULT_VIEWER_URL_STATE.scale
  );
}

function setViewerScale(root, scale) {
  const next = parseScaleValue(scale) ?? DEFAULT_VIEWER_URL_STATE.scale;
  const rounded = Math.round(next * 1000) / 1000;

  const apply = (element) => {
    if (!element) {
      return;
    }
    if (element.dataset) {
      element.dataset.scale = String(rounded);
    }
    element.setAttribute?.('data-scale', String(rounded));
    if (typeof element.style?.setProperty === 'function') {
      element.style.setProperty('--motor-graph-scale', String(rounded));
      element.style.setProperty('--motor-scale', String(rounded));
    }
  };

  apply(root);
  apply(root.querySelector?.('[data-role="viewer-root"]'));
  apply(root.querySelector?.('[data-role="svg-root"]'));
}

function populateGraphExamples(selectEl) {
  GRAPH_EXAMPLES.forEach((example, index) => {
    const option = document.createElement('option');
    option.value = example.id;
    option.textContent = `${index + 1}. ${example.label}`;
    selectEl.appendChild(option);
  });
}

function findGraphExample(exampleId) {
  return GRAPH_EXAMPLES.find((entry) => entry.id === exampleId) ?? GRAPH_EXAMPLES[0];
}

function findGraphExampleByExpression(expression) {
  const normalized = expression?.trim();
  if (!normalized) {
    return null;
  }
  return GRAPH_EXAMPLES.find((example) => formatGraphJSON(example) === normalized) ?? null;
}

function createViewerSection() {
  const container = document.getElementById('graph-viewer');
  if (!container) {
    throw new Error('Missing #graph-viewer element');
  }

  const selectEl = document.getElementById('graph-example');
  const applyButton = document.getElementById('graph-apply');
  if (!(selectEl instanceof HTMLSelectElement) || !(applyButton instanceof HTMLButtonElement)) {
    throw new Error('Graph example controls are missing');
  }

  const controlsWrapper = selectEl.closest('.card__controls');

  populateGraphExamples(selectEl);
  selectEl.value = GRAPH_EXAMPLES[0].id;

  const viewerHandle = createViewer(container, {
    initialJSON: formatGraphJSON(GRAPH_EXAMPLES[0]),
  });

  // Parse the initial example once the viewer is ready.
  viewerHandle.parse();

  const textarea = getViewerTextarea(container);
  const overlayInputs = Array.from(
    container.querySelectorAll('input[data-role="overlay-toggle"]'),
  );

  const copyLinkButton = document.createElement('button');
  copyLinkButton.type = 'button';
  copyLinkButton.id = 'graph-copy-link';
  copyLinkButton.className = 'control__button';
  copyLinkButton.textContent = 'Copy link';
  copyLinkButton.setAttribute('aria-label', 'Copy a shareable link to this viewer state');
  if (controlsWrapper instanceof HTMLElement) {
    controlsWrapper.appendChild(copyLinkButton);
  } else {
    applyButton.insertAdjacentElement('afterend', copyLinkButton);
  }

  const readViewerState = () => ({
    expression: textarea?.value ?? '',
    overlays: getOverlayStateFromViewer(container),
    scale: getViewerScale(container),
  });

  const syncUrl = () => {
    const shareUrl = encodeViewerStateToUrl(readViewerState(), window.location.href);
    window.history.replaceState(null, '', shareUrl);
    return shareUrl;
  };

  const scheduleUrlSync = (() => {
    let timeoutId = null;
    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      timeoutId = window.setTimeout(() => {
        timeoutId = null;
        syncUrl();
      }, 160);
    };
  })();

  const applyViewerStateFromUrl = () => {
    const decoded = decodeViewerStateFromSearch(window.location.search);
    if (textarea) {
      const target = decoded.expression ?? '';
      if (textarea.value !== target) {
        textarea.value = target;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
      viewerHandle.parse();
      const match = findGraphExampleByExpression(target);
      if (match) {
        selectEl.value = match.id;
      }
    }
    applyOverlayStateToViewer(container, decoded.overlays);
    setViewerScale(container, decoded.scale);
    syncUrl();
  };

  const loadExample = (exampleId) => {
    const example = findGraphExample(exampleId);
    if (!example || !textarea) {
      return;
    }
    const formatted = formatGraphJSON(example);
    if (textarea.value !== formatted) {
      textarea.value = formatted;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
    viewerHandle.parse();
    selectEl.value = example.id;
    scheduleUrlSync();
  };

  applyButton.addEventListener('click', () => {
    loadExample(selectEl.value);
  });

  selectEl.addEventListener('change', () => {
    loadExample(selectEl.value);
  });

  if (textarea) {
    textarea.addEventListener('input', scheduleUrlSync);
  }

  overlayInputs.forEach((input) => {
    input.addEventListener('change', scheduleUrlSync);
  });

  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === 'attributes') {
          scheduleUrlSync();
          break;
        }
      }
    });
    [
      container,
      container.querySelector('[data-role="viewer-root"]'),
      container.querySelector('[data-role="svg-root"]'),
    ]
      .filter((node) => node instanceof HTMLElement)
      .forEach((target) =>
        observer.observe(target, { attributes: true, attributeFilter: ['data-scale', 'style'] }),
      );
  }

  let copyResetHandle = null;
  const defaultCopyLabel = copyLinkButton.textContent;
  const showCopyFeedback = (label) => {
    copyLinkButton.textContent = label;
    if (copyResetHandle !== null) {
      window.clearTimeout(copyResetHandle);
    }
    copyResetHandle = window.setTimeout(() => {
      copyLinkButton.textContent = defaultCopyLabel;
      copyResetHandle = null;
    }, 2000);
  };

  copyLinkButton.addEventListener('click', () => {
    const shareUrl = syncUrl();
    const markCopied = () => showCopyFeedback('Copied!');

    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(shareUrl)
        .then(markCopied)
        .catch((error) => {
          console.error('[demo] Copy link failed', error);
          const fallback = window.prompt('Copy link', shareUrl);
          if (fallback !== null) {
            markCopied();
          }
        });
      return;
    }

    const fallback = window.prompt('Copy link', shareUrl);
    if (fallback !== null) {
      markCopied();
    }
  });

  applyViewerStateFromUrl();
  window.addEventListener('popstate', applyViewerStateFromUrl);
}

class DemoMathEngine {
  constructor(options) {
    this.#expressions = options.expressions.map((entry, index) => ({
      id: entry.id ?? `expr-${index}`,
      label: entry.label ?? entry.expression,
      expression: entry.expression,
    }));
    this.#listeners = new Map([
      ['hover', new Set()],
      ['select', new Set()],
      ['state', new Set()],
    ]);
    this.#current = null;
    this.#host = null;
    this.#outputNode = null;
    this.#statusNode = null;
    this.#hovered = null;
    this.#selected = null;
    this.#currentActionId = null;
  }

  #expressions;
  #listeners;
  #current;
  #host;
  #outputNode;
  #statusNode;
  #hovered;
  #selected;
  #currentActionId;

  mount(host, initialExpression = '') {
    this.#host = host;
    this.#host.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'demo-math-engine';

    const output = document.createElement('div');
    output.className = 'demo-math-engine__output';
    this.#outputNode = output;

    const status = document.createElement('div');
    status.className = 'demo-math-engine__status';
    this.#statusNode = status;

    wrapper.append(output, status);
    host.appendChild(wrapper);

    const fallback = this.#expressions[0]?.expression ?? '';
    const initial = initialExpression?.trim() ? initialExpression : fallback;
    this.#setExpression(initial);
  }

  on(event, cb) {
    const bucket = this.#listeners.get(event);
    if (!bucket) {
      throw new Error(`Unsupported event: ${event}`);
    }
    bucket.add(cb);
    return () => {
      bucket.delete(cb);
    };
  }

  getLegalActions() {
    return this.#expressions.map((entry) => ({
      id: entry.id,
      label: entry.label,
      kind: 'expression',
    }));
  }

  apply(actionId) {
    const entry = this.#expressions.find((item) => item.id === actionId);
    if (!entry) {
      return;
    }
    this.#setExpression(entry.expression);
  }

  export() {
    return {
      ast: { expression: this.#current },
      html: this.#outputNode?.innerHTML ?? '',
      tex: this.#current,
    };
  }

  #emit(event, payload) {
    const bucket = this.#listeners.get(event);
    if (!bucket) {
      return;
    }
    bucket.forEach((listener) => {
      try {
        listener(payload);
      } catch (err) {
        console.error('[demo] math listener error', err);
      }
    });
  }

  #tokenize(expression) {
    return expression.match(/[A-Za-z]+|\d+|[^\s]/g) ?? [];
  }

  #evaluateExpression(expression) {
    const clean = expression.replace(/\s+/g, '');
    if (/^[\d+\-*/().]+$/.test(clean)) {
      try {
        // eslint-disable-next-line no-new-func
        const result = Function(`"use strict"; return (${expression});`)();
        if (typeof result === 'number' && Number.isFinite(result)) {
          return { kind: 'number', value: result };
        }
      } catch (err) {
        return { kind: 'error', message: err instanceof Error ? err.message : String(err) };
      }
    }
    return { kind: 'symbolic', value: expression };
  }

  #clearHighlights() {
    if (!this.#outputNode) return;
    this.#outputNode.querySelectorAll('[data-token-id]').forEach((el) => {
      el.classList.remove('is-hovered', 'is-selected');
    });
  }

  #attachTokenListeners(span, tokenId) {
    span.addEventListener('mouseenter', () => {
      this.#hovered = tokenId;
      this.#emit('hover', tokenId);
      span.classList.add('is-hovered');
    });
    span.addEventListener('mouseleave', () => {
      this.#hovered = null;
      this.#emit('hover', null);
      span.classList.remove('is-hovered');
    });
    span.addEventListener('click', () => {
      if (this.#selected === tokenId) {
        this.#selected = null;
        span.classList.remove('is-selected');
        this.#emit('select', null);
      } else {
        this.#selected = tokenId;
        this.#emit('select', tokenId);
        this.#syncSelections();
      }
    });
  }

  #syncSelections() {
    if (!this.#outputNode) return;
    this.#outputNode.querySelectorAll('[data-token-id]').forEach((el) => {
      const isSelected = el.dataset.tokenId === this.#selected;
      if (isSelected) {
        el.classList.add('is-selected');
      } else {
        el.classList.remove('is-selected');
      }
    });
  }

  #render(expression) {
    if (!this.#outputNode || !this.#statusNode) {
      return;
    }

    this.#outputNode.innerHTML = '';
    const tokens = this.#tokenize(expression);

    if (tokens.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = 'Expression is empty';
      this.#outputNode.appendChild(empty);
    } else {
      tokens.forEach((token, index) => {
        const span = document.createElement('span');
        const tokenId = `token-${index}`;
        span.dataset.tokenId = tokenId;
        span.textContent = token;
        this.#attachTokenListeners(span, tokenId);
        this.#outputNode.appendChild(span);
      });
    }

    const evaluation = this.#evaluateExpression(expression);
    if (evaluation.kind === 'number') {
      this.#statusNode.textContent = `Result: ${evaluation.value}`;
    } else if (evaluation.kind === 'error') {
      this.#statusNode.textContent = `Error: ${evaluation.message}`;
    } else {
      this.#statusNode.textContent = 'Symbolic expression';
    }

    this.#emit('state', {
      expression,
      evaluation,
      tokenCount: tokens.length,
      activeActionId: this.#currentActionId,
    });
  }

  #setExpression(expression) {
    this.#current = expression;
    this.#hovered = null;
    this.#selected = null;
    const match = this.#expressions.find((item) => item.expression === expression);
    this.#currentActionId = match?.id ?? null;
    this.#render(expression);
  }
}

function createMathActions(engine, container) {
  let activeId = null;

  const render = () => {
    container.innerHTML = '';
    const actions = engine.getLegalActions();
    actions.forEach((action) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = action.label;
      if (action.id === activeId) {
        button.dataset.active = 'true';
      }
      button.addEventListener('click', () => {
        engine.apply(action.id);
      });
      container.appendChild(button);
    });
  };

  render();
  return {
    render,
    setActiveId(id) {
      activeId = id;
      render();
    },
  };
}

function stringifyEventPayload(payload) {
  if (payload == null) {
    return 'null';
  }
  if (typeof payload === 'string' || typeof payload === 'number' || typeof payload === 'boolean') {
    return JSON.stringify(payload);
  }
  try {
    return JSON.stringify(payload, null, 2);
  } catch (err) {
    return String(payload);
  }
}

function createMathPlayground(engineFactory) {
  const host = document.getElementById('math-engine-host');
  const status = document.getElementById('math-engine-status');
  const stateOutput = document.getElementById('math-state');
  const eventsOutput = document.getElementById('math-events');
  const actionsContainer = document.getElementById('math-actions');

  if (!host || !status || !stateOutput || !eventsOutput || !actionsContainer) {
    throw new Error('Math playground markup is incomplete');
  }

  const engine = engineFactory();
  engine.mount(host, EXPRESSIONS[0].expression);

  const actions = createMathActions(engine, actionsContainer);

  const updateEvents = (eventName, payload) => {
    eventsOutput.textContent = `${eventName}: ${stringifyEventPayload(payload)}`;
  };

  engine.on('hover', (payload) => {
    updateEvents('hover', payload);
    if (!payload) {
      status.textContent = 'Hover cleared';
      return;
    }
    status.textContent = `Hovered token: ${payload}`;
  });

  engine.on('select', (payload) => {
    updateEvents('select', payload);
    if (!payload) {
      status.textContent = 'Selection cleared';
      return;
    }
    status.textContent = `Selected token: ${payload}`;
  });

  engine.on('state', (payload) => {
    actions.setActiveId(payload?.activeActionId ?? null);
    stateOutput.textContent = stringifyEventPayload(payload);
  });
}

function resolveMathEngineFactory() {
  const engineGlobal = typeof window !== 'undefined' ? window.Engine : undefined;
  if (typeof engineGlobal === 'function') {
    return () => engineGlobal();
  }
  if (engineGlobal && typeof engineGlobal === 'object') {
    return () => engineGlobal;
  }
  return () => new DemoMathEngine({ expressions: EXPRESSIONS });
}

function bootstrap() {
  createViewerSection();

  const engineFactory = resolveMathEngineFactory();
  initMath(engineFactory);
  createMathPlayground(engineFactory);
}

bootstrap();
