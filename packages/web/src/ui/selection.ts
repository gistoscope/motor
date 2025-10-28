import { resolveVisibleLeaf } from './dom.helpers';

export type TokId = string;

let current: TokId | null = null;

function findById(root: Document | DocumentFragment, tokId: TokId): Element | null {
  if (!tokId) {
    return null;
  }
  if ('getElementById' in root && typeof root.getElementById === 'function') {
    return root.getElementById(tokId);
  }
  const selector = `[id="${tokId.replace(/"/g, '\\"')}"]`;
  return root.querySelector(selector);
}

export function select(tokId: TokId, root: Document | DocumentFragment): void {
  clear(root);
  const anchor = findById(root, tokId);
  if (!anchor) {
    return;
  }
  const node = resolveVisibleLeaf(anchor);
  if (node) {
    node.classList.add('math-token--selected');
    current = tokId;
  }
}

export function clear(root: Document | DocumentFragment): void {
  const selected = root.querySelectorAll('.math-token--selected');
  selected.forEach((element) => {
    element.classList.remove('math-token--selected');
  });
  current = null;
}

export function getCurrent(): TokId | null {
  return current;
}
