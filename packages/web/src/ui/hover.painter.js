/**
 * @typedef {Object} HoverPainterOpts
 * @property {() => Element | null} [getRoot]
 * @property {boolean} [devLog]
 */

/**
 * @param {HoverPainterOpts} [opts]
 */
export function installHoverPainter(opts = {}) {
  const d = document;
  let raf = 0;
  let lastId = null;

  const rootOf = () =>
    (opts.getRoot && opts.getRoot()) ||
    d.querySelector('.katex .katex-html') ||
    d.querySelector('.katex-html');

  const clear = (root) => {
    root
      .querySelectorAll('.math-token--hovered')
      .forEach((node) => node.classList.remove('math-token--hovered'));
  };

  const paint = (id) => {
    const root = rootOf();
    if (!root) return;
    clear(root);
    if (!id) return;
    root
      .querySelectorAll(`[id="${id}"]`)
      .forEach((node) => node.classList.add('math-token--hovered'));
    if (opts.devLog) console.debug('[hover.paint]', id);
  };

  const pickIdAtPoint = (x, y) => {
    const root = rootOf();
    if (!root) return null;
    const stack = d.elementsFromPoint(x, y);
    for (const el of stack) {
      if (!(el instanceof Element)) continue;
      if (!root.contains(el)) continue;
      const hit = el.closest('[id^="tok:"]');
      if (hit && root.contains(hit)) return (/** @type {HTMLElement} */ (hit)).id || null;
    }
    return null;
  };

  const paintAsync = () => {
    raf = 0;
    paint(lastId);
  };

  const onMove = (e) => {
    const id = pickIdAtPoint(e.clientX, e.clientY);
    if (id === lastId) return;
    lastId = id;
    if (!raf) raf = requestAnimationFrame(paintAsync);
  };

  const onLeave = () => {
    lastId = null;
    paint(null);
  };

  d.addEventListener('pointermove', onMove, { capture: true, passive: true });
  d.addEventListener('pointerleave', onLeave, { capture: true, passive: true });

  if (typeof window !== 'undefined') {
    window.__hoverPainterReady = true;
  }

  return () => {
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    d.removeEventListener('pointermove', onMove, true);
    d.removeEventListener('pointerleave', onLeave, true);
    paint(null);
    if (typeof window !== 'undefined') {
      window.__hoverPainterReady = false;
    }
  };
}

export default installHoverPainter;
