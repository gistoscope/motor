export type Selected = { id: string } | null;

let currentSelection: Selected = null;

const findKatexRoot = (doc: Document): HTMLElement | null =>
  doc.querySelector<HTMLElement>('.katex .katex-html') ??
  doc.querySelector<HTMLElement>('.katex-html');

const hasVisibleGlyph = (element: Element): boolean => {
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

const resolveVisibleLeaf = (element: Element): HTMLElement | null => {
  const queue: Element[] = [element];
  let fallback: Element | null = element;

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (!isIgnorableLeaf(current) && hasVisibleGlyph(current)) {
      return current as HTMLElement;
    }

    const children = Array.from(current.children) as Element[];
    if (children.length === 0) {
      if (!isIgnorableLeaf(current)) {
        return current as HTMLElement;
      }
      continue;
    }

    for (const child of children) {
      if (!isIgnorableLeaf(child)) {
        queue.push(child);
      }
    }

    fallback = current;
  }

  return fallback instanceof HTMLElement ? fallback : null;
};

export function clearSelection(doc: Document): void {
  currentSelection = null;
  const targets = Array.from(doc.querySelectorAll('.math-token--selected'));
  for (const el of targets) {
    el.classList.remove('math-token--selected');
  }
}

export function selectByTokId(tokId: string, doc: Document): boolean {
  if (!tokId) {
    return false;
  }

  const root = findKatexRoot(doc);
  if (!root) {
    return false;
  }

  const anchor = root.querySelector<HTMLElement>(`#${CSS.escape(tokId)}`);
  if (!anchor) {
    return false;
  }

  const leaf = resolveVisibleLeaf(anchor);
  if (!leaf) {
    return false;
  }

  clearSelection(doc);
  anchor.classList.add('math-token--selected');
  if (leaf !== anchor) {
    leaf.classList.add('math-token--selected');
  }

  const view = doc.defaultView as (Window & { __gvClickReady?: boolean }) | null;
  if (view) {
    view.__gvClickReady = true;
  }

  currentSelection = { id: anchor.id || leaf.id || tokId };
  return true;
}

export function getSelection(): Selected {
  return currentSelection;
}
