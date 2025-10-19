export type IdempotentRelease = () => void;

export function isIdempotentClick(element: HTMLButtonElement | null): IdempotentRelease | null {
  if (!element) {
    return null;
  }

  if (element.disabled) {
    return null;
  }

  if (element.dataset.busy === 'true') {
    return null;
  }

  element.dataset.busy = 'true';
  element.disabled = true;
  element.setAttribute('aria-busy', 'true');

  return () => {
    delete element.dataset.busy;
    element.disabled = false;
    element.removeAttribute('aria-busy');
  };
}
