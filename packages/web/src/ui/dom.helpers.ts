function textContentHasVisibleGlyph(element: Element): boolean {
  for (const node of Array.from(element.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
      return true;
    }
  }
  return false;
}

function isIgnorableLeaf(element: Element): boolean {
  if (!(element instanceof HTMLElement)) {
    return false;
  }
  if (element.classList.contains('strut')) {
    return true;
  }
  const ariaHidden = element.getAttribute('aria-hidden');
  return ariaHidden === 'true';
}

export function resolveVisibleLeaf(element: Element | null): Element | null {
  if (!element) {
    return null;
  }
  const queue: Element[] = [element];
  let lastFallback: Element | null = element;

  while (queue.length) {
    const current = queue.shift()!;
    if (!isIgnorableLeaf(current) && textContentHasVisibleGlyph(current)) {
      return current;
    }

    const children = Array.from(current.children);
    if (children.length === 0) {
      if (!isIgnorableLeaf(current)) {
        return current;
      }
      lastFallback = current;
      continue;
    }

    let enqueuedVisibleChild = false;
    for (const child of children) {
      if (!isIgnorableLeaf(child)) {
        queue.push(child);
        enqueuedVisibleChild = true;
      }
    }

    if (!enqueuedVisibleChild) {
      queue.push(...children);
    }

    lastFallback = current;
  }

  return lastFallback;
}

export function nearestTokFromComposedPath(event: Event): HTMLElement | null {
  const composedPath =
    typeof (event as { composedPath?: () => EventTarget[] }).composedPath === 'function'
      ? (event as { composedPath: () => EventTarget[] }).composedPath()
      : [];

  const fallbackPath = (): EventTarget[] => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return [];
    }
    const chain: Element[] = [];
    for (let el: Element | null = target; el; el = el.parentElement) {
      chain.push(el);
    }
    return chain;
  };

  const searchPath = composedPath.length > 0 ? composedPath : fallbackPath();
  for (const item of searchPath) {
    if (!(item instanceof HTMLElement)) {
      continue;
    }
    const id = item.id || '';
    if (id.startsWith('tok:')) {
      return item;
    }
  }
  return null;
}
