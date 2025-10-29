/**
 * @typedef {Object} BracketDescriptor
 * @property {string} id
 * @property {'open' | 'close'} side
 * @property {string} text
 * @property {string | null} sizeClass
 * @property {boolean} symmetric
 * @property {boolean} isNull
 * @property {string | null} family
 */

const OPEN_KEY = new Map([
  ['(', '()'],
  ['[', '[]'],
  ['{', '{}'],
  ['⟦', '⟦⟧'],
  ['⟨', '⟨⟩'],
  ['⟪', '⟪⟫'],
  ['⌈', 'ceil'],
  ['⌊', 'floor'],
  ['|', '|'],
  ['‖', '‖'],
]);

const CLOSE_KEY = new Map([
  [')', '()'],
  [']', '[]'],
  ['}', '{}'],
  ['⟧', '⟦⟧'],
  ['⟩', '⟨⟩'],
  ['⟫', '⟪⟫'],
  ['⌉', 'ceil'],
  ['⌋', 'floor'],
  ['|', '|'],
  ['‖', '‖'],
]);

const NORMALIZE = new Map([
  ['⟮', '('],
  ['⟯', ')'],
  ['⟬', '{'],
  ['⟭', '}'],
  ['⦃', '{'],
  ['⦄', '}'],
  ['⟪', '⟪'],
  ['⟫', '⟫'],
  ['⟦', '⟦'],
  ['⟧', '⟧'],
  ['⟨', '⟨'],
  ['⟩', '⟩'],
  ['∣', '|'],
  ['¦', '|'],
  ['⎪', '|'],
]);

let bracketCounter = 0;

function normalizeSymbol(symbol) {
  const trimmed = symbol.trim();
  if (!trimmed) {
    return '';
  }
  return NORMALIZE.get(trimmed) ?? trimmed;
}

function openKeyFor(token) {
  if (token.family) {
    return token.family;
  }
  const normal = normalizeSymbol(token.text);
  if (token.symmetric) {
    return normal || token.family || token.id;
  }
  if (!normal) {
    return '';
  }
  return OPEN_KEY.get(normal) ?? normal;
}

function closeKeyFor(token) {
  if (token.family) {
    return token.family;
  }
  const normal = normalizeSymbol(token.text);
  if (token.symmetric) {
    return normal || token.family || token.id;
  }
  if (!normal) {
    return '';
  }
  return CLOSE_KEY.get(normal) ?? normal;
}

function describeElement(element) {
  const side = element.classList.contains('mclose') ? 'close' : 'open';
  const sizeClass = Array.from(element.classList).find((cls) => cls.startsWith('delim-size')) ?? null;
  const text = element.textContent ?? '';
  const symmetric = /\|/.test(text);
  const isNull = element.classList.contains('nulldelimiter') || text.trim().length === 0;
  const family = element.getAttribute('data-delim-family');
  return {
    id: element.dataset.bracketId ?? '',
    side,
    text,
    sizeClass,
    symmetric: Boolean(symmetric),
    isNull,
    family,
  };
}

export function ensureIdsForBrackets(root) {
  const elements = Array.from(root.querySelectorAll('.mopen, .mclose'));
  return elements.map((element) => {
    if (!element.dataset.bracketId) {
      element.dataset.bracketId = `br-${bracketCounter++}`;
    }
    return element;
  });
}

export function describeBrackets(elements) {
  return elements.map(describeElement);
}

export function buildPairs(descriptors) {
  const stack = [];
  const pairs = [];
  const openOrphans = [];
  const closeOrphans = [];

  for (const descriptor of descriptors) {
    const payload = {
      descriptor,
      key: descriptor.side === 'open' ? openKeyFor(descriptor) : closeKeyFor(descriptor),
    };

    if (descriptor.side === 'open') {
      stack.push(payload);
      continue;
    }

    let matchedIndex = -1;
    for (let i = stack.length - 1; i >= 0; i -= 1) {
      if (stack[i].key && stack[i].key === payload.key) {
        matchedIndex = i;
        break;
      }
    }

    if (matchedIndex === -1) {
      for (let i = stack.length - 1; i >= 0; i -= 1) {
        if (stack[i].descriptor.isNull) {
          matchedIndex = i;
          break;
        }
      }
    }

    if (matchedIndex === -1) {
      closeOrphans.push(descriptor.id);
      continue;
    }

    const opener = stack.splice(matchedIndex, 1)[0];
    pairs.push({
      openId: opener.descriptor.id,
      closeId: descriptor.id,
      key: payload.key,
    });
  }

  for (const entry of stack) {
    openOrphans.push(entry.descriptor.id);
  }

  return { pairs, openOrphans, closeOrphans };
}

export class HoverPainter {
  constructor(root) {
    this.root = root;
    this.activeIds = new Set();
  }

  clear() {
    for (const id of this.activeIds) {
      const el = this.root.querySelector(`[data-bracket-id="${id}"]`);
      if (el) {
        el.classList.remove('is-hovered');
      }
    }
    this.activeIds.clear();
  }

  paint(ids) {
    this.clear();
    for (const id of ids) {
      const el = this.root.querySelector(`[data-bracket-id="${id}"]`);
      if (el) {
        el.classList.add('is-hovered');
        this.activeIds.add(id);
      }
    }
  }
}

export function analyzeBrackets(root) {
  const elements = ensureIdsForBrackets(root);
  const descriptors = describeBrackets(elements);
  return buildPairs(descriptors);
}
