/**
 * Единая точка правды для поиска DOM-якорей по логическому ID.
 * Порядок приоритета:
 *   1) #<LogicalId>         — \htmlId от KaTeX (CC06A)
 *   2) [data-gv-id="<id>"]  — будущий data-канон
 *   3) [data-token-id="<id>"] — легаси-совместимость (временная)
 */

const ENABLE_LEGACY_DATA_TOKEN = true;

function escapeAttribute(value) {
  return String(value).replace(/"/g, '\\"');
}

function asHTMLElement(node) {
  if (!node) {
    return null;
  }
  if (typeof HTMLElement === 'undefined') {
    return (node && typeof node === 'object' && 'nodeType' in node && node.nodeType === 1)
      ? node
      : null;
  }
  return node instanceof HTMLElement ? node : null;
}

function queryById(root, logicalId) {
  if (!logicalId) {
    return [];
  }
  const ownerDocument = root.ownerDocument ?? (root.nodeType === 9 ? root : null);
  const element = ownerDocument?.getElementById?.(logicalId);
  if (!element || !asHTMLElement(element)) {
    return [];
  }
  if (root.nodeType === 9) {
    return [element];
  }
  return (root.contains && root.contains(element)) ? [element] : [];
}

export function anchorSelectors(logicalId) {
  const safeId = escapeAttribute(logicalId);
  const selectors = [`#${logicalId}`, `[data-gv-id="${safeId}"]`];
  if (ENABLE_LEGACY_DATA_TOKEN) {
    selectors.push(`[data-token-id="${safeId}"]`);
  }
  return selectors;
}

export function queryAnchors(root, logicalId) {
  if (!root) {
    return [];
  }
  const seen = new Set();
  const result = [];
  for (const element of queryById(root, logicalId)) {
    if (!seen.has(element)) {
      seen.add(element);
      result.push(element);
    }
  }
  const safe = escapeAttribute(logicalId);
  const selectorList = [];
  if (safe.length > 0) {
    selectorList.push(`[data-gv-id="${safe}"]`);
    if (ENABLE_LEGACY_DATA_TOKEN) {
      selectorList.push(`[data-token-id="${safe}"]`);
    }
  }
  if (typeof root.querySelectorAll === 'function') {
    for (const selector of selectorList) {
      const found = root.querySelectorAll(selector);
      for (const node of found) {
        const element = asHTMLElement(node);
        if (element && !seen.has(element)) {
          seen.add(element);
          result.push(element);
        }
      }
    }
  }
  return result;
}

export function addClassByLogicalIds(root, logicalIds, className) {
  const unique = new Set();
  for (const id of logicalIds ?? []) {
    for (const element of queryAnchors(root, id)) {
      if (unique.has(element)) {
        continue;
      }
      element.classList.add(className);
      unique.add(element);
    }
  }
  return unique.size;
}

export function removeClassByLogicalIds(root, logicalIds, className) {
  let removed = 0;
  for (const id of logicalIds ?? []) {
    for (const element of queryAnchors(root, id)) {
      if (element.classList.contains(className)) {
        element.classList.remove(className);
        removed += 1;
      }
    }
  }
  return removed;
}

export function clearClassEverywhere(root, className) {
  if (!root || typeof root.querySelectorAll !== 'function') {
    return;
  }
  root.querySelectorAll(`.${className}`).forEach((element) => {
    const htmlElement = asHTMLElement(element);
    if (htmlElement) {
      htmlElement.classList.remove(className);
      if (htmlElement.className.trim().length === 0) {
        htmlElement.removeAttribute('class');
      }
    }
  });
}
