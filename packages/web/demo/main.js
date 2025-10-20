window.MOTOR_DISABLE_WORKERS = true;

async function importWithTsFallback(specifier) {
  try {
    return await import(specifier);
  } catch (error) {
    if (
      typeof specifier === 'string' &&
      specifier.endsWith('.js') &&
      error instanceof Error &&
      /Cannot find module/iu.test(error.message ?? '')
    ) {
      const fallbackSpecifier = specifier.replace(/\.js$/u, '.ts');
      return import(fallbackSpecifier);
    }
    throw error;
  }
}

const {
  createViewer,
  initMath,
  fromRealEngine,
  mountPlayground,
  mountEnginePane,
} = await importWithTsFallback('../src/index.js');
const {
  decodeViewerStateFromSearch,
  encodeViewerStateToUrl,
  DEFAULT_VIEWER_URL_STATE,
} = await importWithTsFallback('../src/util/state-url.js');

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

const SAMPLE_EXPRESSIONS = [
  { id: 'sample-add', label: 'Load 2 + 3', expression: '2 + 3' },
  { id: 'sample-combine', label: 'Load 3x + 2x', expression: '3x + 2x' },
  { id: 'sample-divide', label: 'Load (a + b) / c', expression: '(a + b) / c' },
];

const DEFAULT_SAMPLE_ID = SAMPLE_EXPRESSIONS[0]?.id ?? 'sample-default';

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

function normalizeExpressionValue(expression) {
  return typeof expression === 'string' ? expression.replace(/\s+/g, '').trim() : '';
}

function findSampleByExpression(expression) {
  const normalized = normalizeExpressionValue(expression);
  if (!normalized) {
    return null;
  }
  return (
    SAMPLE_EXPRESSIONS.find(
      (sample) => normalizeExpressionValue(sample.expression) === normalized,
    ) ?? null
  );
}

function createSampleControls(container, onSelect) {
  container.innerHTML = '';
  const buttons = new Map();

  SAMPLE_EXPRESSIONS.forEach((sample) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.sampleId = sample.id;
    button.textContent = sample.label;
    button.title = sample.expression;
    button.addEventListener('click', () => {
      onSelect(sample);
    });
    container.appendChild(button);
    buttons.set(sample.id, button);
  });

  return {
    setActiveExpression(expression) {
      const match = findSampleByExpression(expression);
      buttons.forEach((button, id) => {
        if (match && id === match.id) {
          button.dataset.active = 'true';
        } else {
          button.removeAttribute('data-active');
        }
      });
    },
  };
}

function resolveEngineName(candidate) {
  if (!candidate) {
    return null;
  }
  if (typeof candidate === 'function') {
    const displayName = candidate.displayName ?? candidate.name;
    if (typeof displayName === 'string' && displayName.trim()) {
      return displayName.trim();
    }
  }
  if (typeof candidate === 'object') {
    const record = candidate;
    if (typeof record.displayName === 'string' && record.displayName.trim()) {
      return record.displayName.trim();
    }
    if (typeof record.name === 'string' && record.name.trim()) {
      return record.name.trim();
    }
    const ctorName = record.constructor && typeof record.constructor.name === 'string' ? record.constructor.name : '';
    if (ctorName && ctorName !== 'Object') {
      return ctorName;
    }
  }
  return null;
}

function tryInstantiateCandidate(candidate) {
  if (!candidate) {
    return null;
  }
  if (typeof candidate === 'function') {
    try {
      const direct = candidate();
      if (direct) {
        return direct;
      }
    } catch (error) {
      // ignore direct invocation errors
    }
    try {
      const constructed = new candidate();
      if (constructed) {
        return constructed;
      }
    } catch (error) {
      // ignore construction errors
    }
    return null;
  }
  if (typeof candidate === 'object') {
    if (typeof candidate.create === 'function') {
      try {
        const created = candidate.create();
        if (created) {
          return created;
        }
      } catch (error) {
        // ignore create errors and fall back to object itself
      }
    }
    return candidate;
  }
  return null;
}

function createInstantiateResolver(candidate) {
  const functionCandidates = [];
  const objectCandidates = [];

  const enqueue = (value) => {
    if (!value) {
      return;
    }
    if (typeof value === 'function') {
      if (!functionCandidates.includes(value)) {
        functionCandidates.push(value);
      }
      return;
    }
    if (typeof value === 'object' && !objectCandidates.includes(value)) {
      objectCandidates.push(value);
    }
  };

  enqueue(candidate);
  if (candidate && typeof candidate === 'object') {
    enqueue(candidate.default);
    enqueue(candidate.RealMathEngine);
    enqueue(candidate.MathEngine);
    enqueue(candidate.Engine);
    enqueue(candidate.engine);
  }

  return () => {
    for (const fn of functionCandidates) {
      const instance = tryInstantiateCandidate(fn);
      if (instance) {
        return instance;
      }
    }
    for (const obj of objectCandidates) {
      const instance = tryInstantiateCandidate(obj);
      if (instance) {
        return instance;
      }
    }
    throw new Error('Unable to instantiate math engine');
  };
}

async function resolveMathEngineAdapter() {
  const globalCandidate = typeof window !== 'undefined' ? window.RealMathEngine : undefined;

  if (globalCandidate) {
    try {
      const instantiate = createInstantiateResolver(globalCandidate);
      const realInstance = instantiate();
      if (!realInstance) {
        throw new Error('RealMathEngine returned an empty instance');
      }

      const meta = {
        source: 'real',
        name: resolveEngineName(realInstance) ?? resolveEngineName(globalCandidate) ?? 'RealMathEngine',
        origin: 'window.RealMathEngine',
      };

      const versionCandidate =
        (realInstance && typeof realInstance.version === 'string' && realInstance.version.trim())
          ? realInstance.version.trim()
          : typeof globalCandidate === 'object' && typeof globalCandidate.version === 'string'
          ? globalCandidate.version.trim()
          : '';
      if (versionCandidate) {
        meta.version = versionCandidate;
      }

      const canCreateMultiple =
        typeof globalCandidate === 'function' ||
        (globalCandidate && typeof globalCandidate.create === 'function');

      const firstEngine = fromRealEngine(realInstance);

      return {
        firstEngine,
        createEngine: canCreateMultiple ? () => fromRealEngine(instantiate()) : null,
        meta,
      };
    } catch (error) {
      console.warn('[demo] Failed to instantiate window.RealMathEngine', error);
    }
  }

  try {
    const stubModule = await import('./engine.stub.js');
    const stubExpressions = SAMPLE_EXPRESSIONS.map((sample) => ({
      id: sample.id,
      label: sample.label.replace(/^Load\s+/iu, '').trim() || sample.label,
      expression: sample.expression,
    }));

    const stubFactory =
      typeof stubModule.createStubRealMathEngineFactory === 'function'
        ? stubModule.createStubRealMathEngineFactory({ expressions: stubExpressions })
        : () => stubModule.createStubRealMathEngine({ expressions: stubExpressions });

    const stubInstance = stubFactory();
    const meta = {
      source: 'stub',
      name: resolveEngineName(stubModule.StubRealMathEngine) ?? 'StubRealMathEngine',
      origin: 'demo fallback',
    };

    return {
      firstEngine: fromRealEngine(stubInstance),
      createEngine: () => fromRealEngine(stubFactory()),
      meta,
    };
  } catch (error) {
    throw new Error('Unable to load fallback math engine', { cause: error });
  }
}

function renderMathBootstrapError(message) {
  const playground = document.getElementById('math-playground');
  const samplesContainer = document.getElementById('math-samples');
  if (!playground) {
    return;
  }
  const info = playground.querySelector('[data-role="math-engine-info"]');
  const status = playground.querySelector('[data-role="math-status"]');
  if (info) {
    info.textContent = 'Engine: unavailable';
  }
  if (status) {
    status.textContent = message;
    status.dataset.tone = 'error';
    status.dataset.persist = 'true';
  }
  if (samplesContainer) {
    samplesContainer.innerHTML = '';
  }
}

function renderEnginePaneUnavailable(message) {
  const pane = document.getElementById('engine-pane');
  if (!pane) {
    return;
  }
  const info = pane.querySelector('[data-role="engine-info"]');
  const status = pane.querySelector('[data-role="engine-status"]');
  if (info) {
    info.textContent = 'Engine: unavailable';
  }
  if (status) {
    status.textContent = message;
    status.dataset.tone = 'error';
    status.dataset.persist = 'true';
  }
  const applyButtons = pane.querySelectorAll('[data-role="engine-apply"]');
  applyButtons.forEach((button) => {
    if (button instanceof HTMLButtonElement) {
      button.disabled = true;
    }
  });
  const input = pane.querySelector('[data-role="engine-input"]');
  if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
    input.disabled = true;
  }
}

function createEnginePane(engine, meta) {
  const root = document.getElementById('engine-pane');
  const samplesContainer = document.getElementById('engine-samples');
  const focusButton = document.getElementById('engine-input-focus');

  if (!root) {
    throw new Error('Engine pane markup is incomplete');
  }

  if (!engine || typeof engine.mount !== 'function') {
    throw new Error('Engine instance is not available');
  }

  const defaultSample =
    SAMPLE_EXPRESSIONS.find((sample) => sample.id === DEFAULT_SAMPLE_ID) ?? SAMPLE_EXPRESSIONS[0];
  const initialExpression = defaultSample?.expression ?? '';

  let samplesHandle = null;
  const paneHandle = mountEnginePane(root, engine, {
    initialExpression,
    onExpressionChange: (expression) => {
      samplesHandle?.setActiveExpression(expression);
    },
    onInputChange: (value) => {
      samplesHandle?.setActiveExpression(value);
    },
  });

  paneHandle.setEngineMeta(meta ?? null);

  if (samplesContainer) {
    samplesHandle = createSampleControls(samplesContainer, (sample) => {
      paneHandle.setExpression(sample.expression);
    });
    if (initialExpression) {
      samplesHandle.setActiveExpression(initialExpression);
    }
  }

  if (focusButton instanceof HTMLButtonElement) {
    focusButton.addEventListener('click', () => {
      paneHandle.focusInput();
    });
  }
}

function createMathPlayground(engine, meta) {
  const root = document.getElementById('math-playground');
  const samplesContainer = document.getElementById('math-samples');
  const focusButton = document.getElementById('math-input-focus');

  if (!root || !samplesContainer) {
    throw new Error('Math playground markup is incomplete');
  }

  if (!engine || typeof engine.mount !== 'function') {
    throw new Error('Math engine instance is not available');
  }

  const defaultSample =
    SAMPLE_EXPRESSIONS.find((sample) => sample.id === DEFAULT_SAMPLE_ID) ?? SAMPLE_EXPRESSIONS[0];
  const initialExpression = defaultSample?.expression ?? '';

  let samplesHandle = null;
  const playgroundHandle = mountPlayground(root, engine, {
    initialExpression,
    onExpressionChange: (expression) => {
      samplesHandle?.setActiveExpression(expression);
    },
    onInputChange: (value) => {
      samplesHandle?.setActiveExpression(value);
    },
  });

  playgroundHandle.setEngineMeta(meta ?? null);

  samplesHandle = createSampleControls(samplesContainer, (sample) => {
    playgroundHandle.loadExpression(sample.expression);
  });

  if (initialExpression) {
    samplesHandle.setActiveExpression(initialExpression);
  }

  if (focusButton instanceof HTMLButtonElement) {
    focusButton.addEventListener('click', () => {
      playgroundHandle.focusInput();
    });
  }
}

async function bootstrap() {
  createViewerSection();

  try {
    const adapter = await resolveMathEngineAdapter();
    if (!adapter || !adapter.firstEngine) {
      renderMathBootstrapError('Math engine is unavailable.');
      renderEnginePaneUnavailable('Engine is unavailable.');
      return;
    }

    if (typeof adapter.createEngine === 'function') {
      initMath(() => adapter.createEngine());
    } else {
      initMath(adapter.firstEngine);
    }

    let enginePaneEngine = null;
    let playgroundEngine = adapter.firstEngine;

    if (typeof adapter.createEngine === 'function') {
      enginePaneEngine = adapter.firstEngine;
      try {
        playgroundEngine = adapter.createEngine();
      } catch (error) {
        console.warn('[demo] Failed to create playground engine instance', error);
        playgroundEngine = adapter.firstEngine;
      }
    }

    if (enginePaneEngine) {
      try {
        createEnginePane(enginePaneEngine, adapter.meta);
      } catch (error) {
        console.error('[demo] Failed to initialize engine pane', error);
        renderEnginePaneUnavailable('Failed to initialize engine pane.');
      }
    } else {
      renderEnginePaneUnavailable('Engine pane requires reusable engine instances.');
    }

    createMathPlayground(playgroundEngine, adapter.meta);
  } catch (error) {
    console.error('[demo] Failed to initialize math playground', error);
    renderMathBootstrapError('Failed to initialize math engine.');
    renderEnginePaneUnavailable('Failed to initialize engine.');
  }
}

bootstrap().catch((error) => {
  console.error('[demo] Unexpected bootstrap error', error);
});
