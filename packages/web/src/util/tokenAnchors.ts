const TOKEN_ID_PREFIX = 'gv:V1:';

function escapeAttribute(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function coerceTrimmed(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function extractTokenIdFromIdAttribute(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  if (!value.startsWith(TOKEN_ID_PREFIX)) {
    return null;
  }
  const suffix = value.slice(TOKEN_ID_PREFIX.length).trim();
  return suffix ? suffix : null;
}

function asHTMLElement(element: Element | null): HTMLElement | null {
  if (!element) {
    return null;
  }
  if (typeof HTMLElement === 'undefined') {
    return (element as { nodeType?: unknown }).nodeType === 1 ? (element as HTMLElement) : null;
  }
  return element instanceof HTMLElement ? (element as HTMLElement) : null;
}

export function readTokenId(element: Element | null): string | null {
  const htmlElement = asHTMLElement(element);
  if (!htmlElement) {
    return null;
  }
  const datasetToken = coerceTrimmed(htmlElement.dataset?.tokenId);
  if (datasetToken) {
    return datasetToken;
  }
  const dataId = coerceTrimmed(htmlElement.getAttribute('data-id'));
  const dataKind = coerceTrimmed(htmlElement.getAttribute('data-kind'));
  if (dataId && dataKind === 'token') {
    return dataId;
  }
  return extractTokenIdFromIdAttribute(htmlElement.getAttribute('id'));
}

export function isTokenElement(element: Element | null): element is HTMLElement {
  return readTokenId(element) !== null;
}

export const TOKEN_ELEMENT_SELECTOR = `[data-token-id], [data-id], [id^="${TOKEN_ID_PREFIX}"]`;

export function queryAllTokenElements(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(TOKEN_ELEMENT_SELECTOR)).filter((element) =>
    readTokenId(element) !== null,
  );
}

export function getTokenSelector(tokenId: string): string {
  const escapedToken = escapeAttribute(tokenId);
  const escapedId = escapeAttribute(`${TOKEN_ID_PREFIX}${tokenId}`);
  return `[data-token-id="${escapedToken}"], [data-id="${escapedToken}"], [id="${escapedId}"]`;
}

export function queryTokenElements(root: ParentNode, tokenId: string): HTMLElement[] {
  const selector = getTokenSelector(tokenId);
  return Array.from(root.querySelectorAll<HTMLElement>(selector));
}

export function createTokenElementId(tokenId: string): string {
  return `${TOKEN_ID_PREFIX}${tokenId}`;
}

export { escapeAttribute, TOKEN_ID_PREFIX };
