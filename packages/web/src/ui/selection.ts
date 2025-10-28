export interface Selection {
  current: string | null;
}

interface ClickReadyWindow extends Window {
  __gvClickReady?: boolean;
}

const HIGHLIGHT_CLASSES = ['math-token--selected', 'is-selected'] as const;

const defaultDocument = typeof document !== 'undefined' ? document : null;

let selectedLeaf: Element | null = null;

const selectionState: Selection = {
  current: null,
};

const textContentHasVisibleGlyph = (element: Element): boolean => {
  for (const node of Array.from(element.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
      return true;
    }
  }
  return false;
};

const isIgnorableLeaf = (element: Element): boolean => {
  if (!(element instanceof HTMLElement)) {
    return false;
  }
  if (element.classList.contains('strut')) {
    return true;
  }
  const ariaHidden = element.getAttribute('aria-hidden');
  return ariaHidden === 'true';
};

const resolveVisibleLeaf = (element: Element): Element => {
  const stack: Element[] = [element];
  let lastFallback = element;

  while (stack.length) {
    const current = stack.shift()!;
    if (!isIgnorableLeaf(current) && textContentHasVisibleGlyph(current)) {
      return current;
    }
    const children = Array.from(current.children) as Element[];
    if (!children.length && !isIgnorableLeaf(current)) {
      return current;
    }
    if (children.length === 0) {
      lastFallback = current;
      continue;
    }
    for (const child of children) {
      if (!isIgnorableLeaf(child)) {
        stack.push(child);
      }
    }
    for (const child of children) {
      stack.push(child);
    }
    lastFallback = current;
  }

  return lastFallback;
};

const removeHighlight = () => {
  if (!selectedLeaf) {
    return;
  }
  for (const cls of HIGHLIGHT_CLASSES) {
    selectedLeaf.classList.remove(cls);
  }
  selectedLeaf = null;
};

const applyHighlight = (leaf: Element) => {
  if (selectedLeaf === leaf) {
    for (const cls of HIGHLIGHT_CLASSES) {
      if (!leaf.classList.contains(cls)) {
        leaf.classList.add(cls);
      }
    }
    return;
  }
  removeHighlight();
  selectedLeaf = leaf;
  for (const cls of HIGHLIGHT_CLASSES) {
    leaf.classList.add(cls);
  }
};

export const selection: Selection = selectionState;

export function select(tokId: string): void {
  if (!tokId || !defaultDocument) {
    return;
  }

  const anchor = defaultDocument.getElementById(tokId);
  if (!anchor) {
    clear();
    return;
  }

  const leaf = resolveVisibleLeaf(anchor);
  selectionState.current = tokId;
  applyHighlight(leaf);

  const docView = anchor.ownerDocument?.defaultView;
  if (docView) {
    (docView as ClickReadyWindow).__gvClickReady = true;
  } else if (typeof window !== 'undefined') {
    (window as ClickReadyWindow).__gvClickReady = true;
  }
}

export function clear(): void {
  selectionState.current = null;
  removeHighlight();
}

export function isSelected(node: Element): boolean {
  if (!selectionState.current) {
    return false;
  }
  if (node === selectedLeaf) {
    return true;
  }
  if (node instanceof HTMLElement && node.id && node.id === selectionState.current) {
    return true;
  }
  return false;
}
