const STYLE_ID = 'motor-katex-style';

function ensureBaseStyles(documentRef) {
  if (!documentRef || documentRef.getElementById(STYLE_ID)) {
    return;
  }
  const style = documentRef.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .katex-placeholder-error {
      color: #c2410c;
      background: rgba(248, 113, 113, 0.2);
      padding: 0.2em 0.4em;
      border-radius: 0.25em;
      font-size: 0.9em;
      display: inline-block;
    }
  `;
  documentRef.head.appendChild(style);
}

function createErrorSpan(documentRef, message) {
  const span = documentRef.createElement('span');
  span.className = 'katex-placeholder-error';
  span.textContent = message;
  return span;
}

function renderToElement(tex, element, options = {}) {
  if (!(element instanceof Element)) {
    throw new TypeError('katex.render target must be an element');
  }
  const ownerDocument = element.ownerDocument || document;
  ensureBaseStyles(ownerDocument);
  element.textContent = '';
  const normalized = typeof tex === 'string' ? tex.trim() : '';
  if (!normalized) {
    return;
  }

  try {
    const fragment = ownerDocument.createDocumentFragment();
    fragment.appendChild(parseLatex(normalized, ownerDocument, options));
    element.appendChild(fragment);
  } catch (error) {
    if (options.throwOnError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    element.appendChild(createErrorSpan(ownerDocument, message));
  }
}

function parseLatex(tex, documentRef, options) {
  const root = documentRef.createElement('span');
  root.className = 'katex katex-display';
  const base = documentRef.createElement('span');
  base.className = 'base';
  base.appendChild(parseInline(tex, documentRef, options));
  root.appendChild(base);
  return root;
}

function isTrustedHtmlCommand(trustOption, command) {
  if (trustOption === true) {
    return true;
  }
  if (typeof trustOption === 'function') {
    try {
      return !!trustOption({ command });
    } catch (_error) {
      return false;
    }
  }
  return false;
}

function parseInline(tex, documentRef, options) {
  const span = documentRef.createElement('span');
  span.className = 'mord';
  const parts = tokenize(tex);
  parts.forEach((part) => {
    if (part.type === 'text') {
      span.appendChild(documentRef.createTextNode(part.value));
      return;
    }
    if (part.type === 'sup' || part.type === 'sub') {
      const script = documentRef.createElement(part.type === 'sup' ? 'sup' : 'sub');
      script.appendChild(documentRef.createTextNode(part.value));
      span.appendChild(script);
      return;
    }
    if (part.type === 'frac') {
      const frac = documentRef.createElement('span');
      frac.className = 'frac';
      const numerator = documentRef.createElement('span');
      numerator.appendChild(documentRef.createTextNode(part.numerator));
      const denominator = documentRef.createElement('span');
      denominator.appendChild(documentRef.createTextNode(part.denominator));
      frac.appendChild(numerator);
      frac.appendChild(denominator);
      span.appendChild(frac);
      return;
    }
    if (part.type === 'htmlId') {
      if (!isTrustedHtmlCommand(options?.trust, '\\htmlId')) {
        span.appendChild(documentRef.createTextNode(`\\htmlId{${part.id}}{${part.value}}`));
        return;
      }
      const wrapper = documentRef.createElement('span');
      wrapper.id = part.id;
      const inner = parseInline(part.value, documentRef, options);
      wrapper.className = inner.className || '';
      while (inner.firstChild) {
        wrapper.appendChild(inner.firstChild);
      }
      if (!wrapper.childNodes.length) {
        wrapper.appendChild(documentRef.createTextNode(part.value));
      }
      span.appendChild(wrapper);
      return;
    }
  });
  return span;
}

function tokenize(tex) {
  const output = [];
  let index = 0;
  while (index < tex.length) {
    const char = tex[index];
    if (tex.startsWith('\\htmlId', index)) {
      const idGroup = readGroup(tex, index + 7);
      const valueGroup = readGroup(tex, idGroup.nextIndex);
      output.push({ type: 'htmlId', id: idGroup.value, value: valueGroup.value });
      index = valueGroup.nextIndex;
      continue;
    }
    if (char === '^' || char === '_') {
      const { value, nextIndex } = readGroup(tex, index + 1);
      output.push({ type: char === '^' ? 'sup' : 'sub', value });
      index = nextIndex;
      continue;
    }
    if (tex.startsWith('\\frac', index)) {
      const first = readGroup(tex, index + 5);
      const second = readGroup(tex, first.nextIndex);
      output.push({ type: 'frac', numerator: first.value, denominator: second.value });
      index = second.nextIndex;
      continue;
    }
    output.push({ type: 'text', value: char });
    index += 1;
  }
  return mergeText(output);
}

function readGroup(tex, start) {
  if (tex[start] === '{') {
    const end = findGroupEnd(tex, start);
    return { value: tex.slice(start + 1, end), nextIndex: end + 1 };
  }
  return { value: tex[start] ?? '', nextIndex: start + 1 };
}

function findGroupEnd(tex, start) {
  let depth = 0;
  for (let i = start; i < tex.length; i += 1) {
    const char = tex[i];
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return i;
      }
    }
  }
  throw new Error('Unbalanced group in expression');
}

function mergeText(tokens) {
  const output = [];
  for (const token of tokens) {
    const last = output[output.length - 1];
    if (token.type === 'text' && last && last.type === 'text') {
      last.value += token.value;
    } else {
      output.push({ ...token });
    }
  }
  return output;
}

export function render(tex, element, options = {}) {
  renderToElement(tex, element, options);
}

export default { render };
