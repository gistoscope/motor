export function installHoverPainter({ getRoot } = {}) {
  let lastId = null;
  let raf = 0;

  const rootOf = () =>
    (getRoot && getRoot()) ||
    document.querySelector('.katex .katex-html') ||
    document.querySelector('.katex-html') ||
    null;

  const clear = (root) => {
    root
      .querySelectorAll('.math-token--hovered')
      .forEach((node) => node.classList.remove('math-token--hovered'));
  };

  const idSelectorFor = (value) => {
    const raw = String(value);
    try {
      if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
        return `[id="${CSS.escape(raw)}"]`;
      }
    } catch {
      // ignore CSS.escape errors, fallback to naive escaping
    }
    return `[id="${raw.replace(/"/g, '\\"')}"]`;
  };

  const paint = (id) => {
    const root = rootOf();
    if (!root) return;
    clear(root);
    if (!id) return;
    // поддерживаем несколько одинаковых логических токенов
    const selector = idSelectorFor(id);
    root
      .querySelectorAll(selector)
      .forEach((node) => node.classList.add('math-token--hovered'));
  };

  const pickIdAtPoint = (x, y) => {
    const root = rootOf();
    if (!root) return null;
    const stack = document.elementsFromPoint(x, y);
    for (const el of stack) {
      if (!(el instanceof Element)) continue;
      if (!root.contains(el)) continue;
      const hit = el.closest('[id]');
      if (hit && root.contains(hit)) return hit.id;
    }
    return null;
  };

  const onMove = (e) => {
    const id = pickIdAtPoint(e.clientX, e.clientY);
    if (id === lastId) return;
    lastId = id;
    if (!raf)
      raf = requestAnimationFrame(() => {
        raf = 0;
        paint(lastId);
      });
  };

  const onLeave = () => {
    lastId = null;
    paint(null);
  };

  document.addEventListener('pointermove', onMove, { capture: true, passive: true });
  document.addEventListener('pointerleave', onLeave, { capture: true, passive: true });

  return () => {
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    document.removeEventListener('pointermove', onMove, true);
    document.removeEventListener('pointerleave', onLeave, true);
    paint(null);
  };
}

export default installHoverPainter;
