export function resolveVisibleLeaf(el) {
  if (!el) return null;
  let n = el;
  while (n && n.firstElementChild) {
    const child = n.firstElementChild;
    const r = child.getBoundingClientRect?.();
    if (r && r.width > 0 && r.height > 0) {
      n = child;
    } else {
      break;
    }
  }
  return n;
}

export function nearestTokFromComposedPath(ev) {
  const path = ev.composedPath ? ev.composedPath() : [];
  for (const p of path) {
    if (p && p.id && typeof p.id === 'string' && p.id.startsWith('tok:')) {
      return p;
    }
  }
  return null;
}
