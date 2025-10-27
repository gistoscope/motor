/**
 * Единая точка для поиска DOM-якорей по логическому ID.
 */
const ENABLE_LEGACY_DATA_TOKEN = true;

export function anchorSelectors(id) {
  const safe = String(id).replace(/"/g, '\\"');
  const sels = [`#${id}`, `[data-gv-id="${safe}"]`];
  if (ENABLE_LEGACY_DATA_TOKEN) sels.push(`[data-token-id="${safe}"]`);
  return sels;
}

export function queryAnchors(root, id) {
  if (!root) return [];
  const out = [];
  const seen = new Set();
  const doc = root.ownerDocument ?? (root.nodeType === 9 ? root : null);
  const rawId = String(id);
  const byId = doc?.getElementById?.(rawId);
  if (byId) {
    if (root.nodeType === 9 || root.contains(byId)) {
      seen.add(byId);
      out.push(byId);
    }
  }
  if (typeof root.querySelectorAll !== 'function') return out;
  for (const s of anchorSelectors(id)) {
    try {
      const found = root.querySelectorAll(s);
      if (found && found.length) {
        for (const el of found) {
          if (!seen.has(el)) {
            seen.add(el);
            out.push(el);
          }
        }
      }
    } catch {
      // ignore invalid selectors like unescaped #id
    }
  }
  return out;
}

export function clearClassEverywhere(root, cls) {
  if (!root || typeof root.querySelectorAll !== 'function') return;
  root.querySelectorAll(`.${cls}`).forEach((el) => el.classList.remove(cls));
}

export function addClassByIds(root, ids, cls) {
  if (!ids) return 0;
  const seen = new Set();
  for (const id of ids) {
    for (const el of queryAnchors(root, id)) {
      if (!seen.has(el)) {
        el.classList.add(cls);
        seen.add(el);
      }
    }
  }
  return seen.size;
}
