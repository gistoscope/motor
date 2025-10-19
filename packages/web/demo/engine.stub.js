const DEFAULT_EXPRESSIONS = [
  { id: 'expr-add', label: '2 + 3', expression: '2 + 3' },
  { id: 'expr-combine', label: '3x + 2x', expression: '3x + 2x' },
  { id: 'expr-divide', label: '(a + b) / c', expression: '(a + b) / c' },
];

class StubRealMathEngine {
  constructor(options = {}) {
    const provided = Array.isArray(options.expressions) ? options.expressions : DEFAULT_EXPRESSIONS;
    this.#expressions = provided.map((entry, index) => ({
      id: entry.id ?? `expr-${index}`,
      label: entry.label ?? entry.expression ?? `Expression ${index + 1}`,
      expression: entry.expression ?? '',
    }));
    this.#listeners = new Map([
      ['hover', new Set()],
      ['select', new Set()],
      ['state', new Set()],
    ]);
    this.#current = '';
    this.#host = null;
    this.#outputNode = null;
    this.#statusNode = null;
    this.#hovered = null;
    this.#selected = null;
    this.#currentActionId = null;
    this.state = {};
    this.actions = [];
    this.events = {
      on: (event, cb) => this.on(event, cb),
      off: (event, cb) => this.off(event, cb),
      addListener: (event, cb) => this.on(event, cb),
      removeListener: (event, cb) => this.off(event, cb),
    };
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

  off(event, cb) {
    const bucket = this.#listeners.get(event);
    if (!bucket) {
      return;
    }
    bucket.delete(cb);
  }

  addListener(event, cb) {
    return this.on(event, cb);
  }

  removeListener(event, cb) {
    this.off(event, cb);
  }

  getLegalActions() {
    return this.#expressions.map((entry) => ({
      id: entry.id,
      label: entry.label,
      kind: 'expression',
    }));
  }

  listActions() {
    return this.getLegalActions();
  }

  suggest() {
    return this.getLegalActions();
  }

  apply(actionId) {
    const entry = this.#expressions.find((item) => item.id === actionId);
    if (!entry) {
      return;
    }
    this.#setExpression(entry.expression);
  }

  applyAction(actionId) {
    this.apply(actionId);
  }

  execute(actionId) {
    this.apply(actionId);
  }

  export() {
    return {
      ast: { expression: this.#current },
      html: this.#outputNode?.innerHTML ?? '',
      tex: this.#current,
    };
  }

  exportState() {
    return this.export();
  }

  #emit(event, payload) {
    const bucket = this.#listeners.get(event);
    if (!bucket) {
      return;
    }
    bucket.forEach((listener) => {
      try {
        listener(payload);
      } catch (error) {
        console.error('[demo] math listener error', error);
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
        const result = Function('"use strict"; return (' + expression + ');')();
        if (typeof result === 'number' && Number.isFinite(result)) {
          return { kind: 'number', value: result };
        }
      } catch (error) {
        return { kind: 'error', message: error instanceof Error ? error.message : String(error) };
      }
    }
    return { kind: 'symbolic', value: expression };
  }

  #clearHighlights() {
    if (!this.#outputNode) {
      return;
    }
    this.#outputNode
      .querySelectorAll('[data-token-id]')
      .forEach((el) => el.classList.remove('is-hovered', 'is-selected'));
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
    if (!this.#outputNode) {
      return;
    }
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

    const actions = this.getLegalActions();
    this.actions = actions;
    const snapshot = {
      expression,
      evaluation,
      tokenCount: tokens.length,
      activeActionId: this.#currentActionId,
      legalActions: actions,
      actions,
    };
    this.state = snapshot;
    this.#emit('state', snapshot);
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

export function createStubRealMathEngine(options = {}) {
  return new StubRealMathEngine(options);
}

export function createStubRealMathEngineFactory(options = {}) {
  return () => new StubRealMathEngine(options);
}

export { StubRealMathEngine };
