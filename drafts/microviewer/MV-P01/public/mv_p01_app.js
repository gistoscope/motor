/* global katex */

/**
 * HoverPainter v2: manages hover-active styling for bracket tokens.
 */
class HoverPainter {
  constructor(root) {
    this.root = root;
    this.activeIds = new Set();
  }

  /** Remove highlight styling from all tracked ids. */
  clear() {
    for (const id of this.activeIds) {
      const el = this.root.querySelector(`#${CSS.escape(id)}`);
      if (el) {
        el.classList.remove('hover-active');
      }
    }
    this.activeIds.clear();
  }

  /** Highlight the provided ids, clearing previous state. */
  highlight(ids) {
    this.clear();
    ids.forEach((id) => {
      const el = this.root.querySelector(`#${CSS.escape(id)}`);
      if (el) {
        el.classList.add('hover-active');
        this.activeIds.add(id);
      }
    });
  }
}

/**
 * Ensure KaTeX-generated brackets have a stable id attribute.
 */
function ensureIdsForBrackets(root) {
  const candidates = root.querySelectorAll('.mopen, .mclose, .delimsizing');
  const timestamp = Date.now();
  let index = 0;
  candidates.forEach((node) => {
    if (!node.id) {
      node.id = `tok:br-${timestamp}-${index++}`;
    }
  });
  return candidates.length;
}

/**
 * Walk the rendered tree and build a left-to-right map of bracket pairs.
 */
function buildPairs(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  const stack = [];
  const pairs = new Map();

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const role = classifyBracket(node);
    if (!role) continue;
    const { id } = node;
    if (!id || !id.startsWith('tok:')) continue;

    if (role === 'open') {
      stack.push(id);
    } else if (role === 'close' && stack.length > 0) {
      const openId = stack.pop();
      pairs.set(openId, id);
    }
  }

  return pairs;
}

function classifyBracket(node) {
  if (!(node instanceof Element)) return null;
  if (node.classList.contains('mopen')) return 'open';
  if (node.classList.contains('mclose')) return 'close';
  if (node.classList.contains('delimsizing')) {
    const text = node.textContent.trim();
    if (text === '(') return 'open';
    if (text === ')') return 'close';
  }
  return null;
}

function main() {
  const input = document.getElementById('latex-input');
  const button = document.getElementById('render-btn');
  const target = document.getElementById('render-target');
  const tokCountEl = document.getElementById('tok-count');
  const pairCountEl = document.getElementById('pair-count');
  const lastTargetEl = document.getElementById('last-target');

  const painter = new HoverPainter(target);
  let pairMap = new Map();
  let reversePairMap = new Map();
  let lastTargetId = null;
  let currentTokCount = 0;
  let currentPairCount = 0;

  function updateInspector(tokCount, pairCount, targetId) {
    tokCountEl.textContent = String(tokCount);
    pairCountEl.textContent = String(pairCount);
    lastTargetEl.textContent = targetId ?? 'n/a';
  }

  function renderLatex() {
    const latex = input.value.trim();
    try {
      katex.render(latex, target, {
        displayMode: true,
        throwOnError: false,
        trust: true
      });
    } catch (error) {
      target.textContent = `Render error: ${error.message}`;
    }

    currentTokCount = ensureIdsForBrackets(target);
    pairMap = buildPairs(target);
    reversePairMap = new Map(Array.from(pairMap.entries(), ([open, close]) => [close, open]));
    currentPairCount = pairMap.size;
    painter.clear();
    lastTargetId = null;
    updateInspector(currentTokCount, currentPairCount, lastTargetId);
  }

  function findTokenId(startNode) {
    let node = startNode;
    while (node && node !== target) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const id = node.id;
        if (id && id.startsWith('tok:')) {
          return id;
        }
      }
      node = node.parentNode;
    }
    return null;
  }

  function handlePointerMove(event) {
    const id = findTokenId(event.target);
    if (id) {
      painter.highlight([id]);
      lastTargetId = id;
    } else {
      painter.clear();
      lastTargetId = null;
    }
    updateInspector(currentTokCount, currentPairCount, lastTargetId);
  }

  function handleClick(event) {
    const id = findTokenId(event.target);
    if (!id) return;

    const pair = pairMap.get(id);
    if (pair) {
      painter.highlight([id, pair]);
      lastTargetId = id;
    } else if (reversePairMap.has(id)) {
      const openId = reversePairMap.get(id);
      painter.highlight([openId, id]);
      lastTargetId = openId;
    } else {
      painter.highlight([id]);
      lastTargetId = id;
    }
    updateInspector(currentTokCount, currentPairCount, lastTargetId);
  }

  target.addEventListener('pointermove', handlePointerMove);
  target.addEventListener('pointerleave', () => {
    painter.clear();
    lastTargetId = null;
    updateInspector(currentTokCount, currentPairCount, lastTargetId);
  });
  target.addEventListener('click', handleClick);
  button.addEventListener('click', renderLatex);

  renderLatex();
}

document.addEventListener('DOMContentLoaded', main);
