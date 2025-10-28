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

  const rootOf = () =>
    (opts.getRoot && opts.getRoot()) ||
    d.querySelector('.katex .katex-html') ||
    d.querySelector('.katex-html');

  const clear = (root) => {
    root
      .querySelectorAll('.math-token--hovered')
      .forEach((node) => node.classList.remove('math-token--hovered'));
  };

  const paintAll = (id) => {
    const root = rootOf();
    if (!root) return;
    clear(root);
    if (!id) return;
    root
      .querySelectorAll(`[id="${id}"]`)
      .forEach((node) => node.classList.add('math-token--hovered'));
    if (opts.devLog) console.debug('[hover.paint]', id);
  };

  const takeTokIdFromPath = (event) => {
    const root = rootOf();
    if (!root) return null;
    const rawPath =
      typeof event.composedPath === 'function'
        ? event.composedPath()
        : [];
    const path =
      rawPath && rawPath.length > 0
        ? rawPath
        : (() => {
            const target = event.target;
            const acc = [];
            if (!(target instanceof Element)) return acc;
            for (let el = target; el; el = el.parentElement) {
              acc.push(el);
            }
            return acc;
          })();
    for (const el of path) {
      if (!(el instanceof Element)) continue;
      if (!root.contains(el)) continue;
      const id = /** @type {HTMLElement} */ (el).id || '';
      if (id.startsWith('tok:')) {
        return id;
      }
    }
    return null;
  };

  let currentId = null;

  const onOver = (event) => {
    const nextId = takeTokIdFromPath(event);
    if (nextId === currentId) {
      return;
    }
    currentId = nextId;
    paintAll(currentId);
  };

  const onOut = (event) => {
    const root = rootOf();
    if (!root) return;
    const rel = event.relatedTarget instanceof Element ? event.relatedTarget : null;
    if (!rel || !root.contains(rel)) {
      currentId = null;
      clear(root);
    }
  };

  const bind = () => {
    const root = rootOf();
    if (!root) return false;
    root.addEventListener('mouseover', onOver, { capture: true, passive: true });
    root.addEventListener('mouseout', onOut, { capture: true, passive: true });
    return true;
  };

  const ok = bind();
  if (typeof window !== 'undefined') {
    window.__hoverPainterReady = ok;
  }

  return () => {
    const root = rootOf();
    if (root) {
      root.removeEventListener('mouseover', onOver, true);
      root.removeEventListener('mouseout', onOut, true);
      clear(root);
    }
    if (typeof window !== 'undefined') {
      window.__hoverPainterReady = false;
    }
  };
}

export default installHoverPainter;
