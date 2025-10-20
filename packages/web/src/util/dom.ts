export type IdempotentRelease = () => void;

function hasNodeType(value: unknown): value is { nodeType: number } {
  return Boolean(value && typeof value === 'object' && 'nodeType' in (value as { nodeType?: unknown }));
}

export function isElementNode(value: unknown): value is Element {
  return hasNodeType(value) && (value as { nodeType: number }).nodeType === 1;
}

export function isHTMLElement(value: unknown): value is HTMLElement {
  if (!isElementNode(value)) {
    return false;
  }
  if (typeof globalThis.HTMLElement === 'undefined') {
    return true;
  }
  return value instanceof globalThis.HTMLElement;
}

export function isHTMLButtonElement(value: unknown): value is HTMLButtonElement {
  if (!isHTMLElement(value)) {
    return false;
  }
  const tag = ((value as HTMLElement).tagName ?? '').toLowerCase();
  return tag === 'button';
}

export function isHTMLInputElement(value: unknown): value is HTMLInputElement {
  if (!isHTMLElement(value)) {
    return false;
  }
  const tag = ((value as HTMLElement).tagName ?? '').toLowerCase();
  return tag === 'input';
}

export function isHTMLTextAreaElement(value: unknown): value is HTMLTextAreaElement {
  if (!isHTMLElement(value)) {
    return false;
  }
  const tag = ((value as HTMLElement).tagName ?? '').toLowerCase();
  return tag === 'textarea';
}

export function isHTMLFormElement(value: unknown): value is HTMLFormElement {
  if (!isHTMLElement(value)) {
    return false;
  }
  const tag = ((value as HTMLElement).tagName ?? '').toLowerCase();
  return tag === 'form';
}

export function isIdempotentClick(element: HTMLButtonElement | null): IdempotentRelease | null {
  if (!isHTMLButtonElement(element)) {
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
