import { addClassByLogicalIds, clearClassEverywhere } from '../dom/anchor-helpers.js';

/**
 * Устанавливает hover-подсветку для KaTeX DOM.
 * По движению мыши ищем ближайший [id] внутри .katex-html и красим его.
 * Возвращает функцию uninstall().
 */
export function installHoverPainter({ getRoot } = {}) {
  let lastId = null;
  let raf = 0;

  const rootOf = () =>
    (getRoot && getRoot()) ||
    document.querySelector('.katex .katex-html') ||
    document.querySelector('.katex-html') ||
    null;

  const paint = (id) => {
    const root = rootOf();
    if (!root) return;
    clearClassEverywhere(root, 'math-token--hovered');
    if (id) addClassByLogicalIds(root, [id], 'math-token--hovered');
  };

  const onMove = (e) => {
    const root = rootOf();
    if (!root) return;
    const t = /** @type {Element|null} */ (e.target instanceof Element ? e.target : null);
    const el = t ? t.closest('[id]') : null;
    const id = el && root.contains(el) ? el.id : null;
    if (id === lastId) return;
    lastId = id;
    if (!raf) raf = requestAnimationFrame(() => { raf = 0; paint(lastId); });
  };

  const onLeave = () => {
    if (!lastId) return;
    lastId = null;
    paint(null);
  };

  // Вешаем capture, чтобы реагировать раньше stopPropagation где-то выше
  document.addEventListener('pointermove', onMove, { capture: true, passive: true });
  document.addEventListener('pointerleave', onLeave, { capture: true, passive: true });

  return () => {
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    document.removeEventListener('pointermove', onMove, true);
    document.removeEventListener('pointerleave', onLeave, true);
    const root = rootOf();
    if (root) clearClassEverywhere(root, 'math-token--hovered');
  };
}

export default installHoverPainter;
