import { readTokenId, TOKEN_ELEMENT_SELECTOR } from '../util/tokenAnchors';
import type { Target } from './ids';
export function pickTarget(el: Element | null): Target | null {
  if (!el) return null;
  const selector = `[data-kind][data-id], ${TOKEN_ELEMENT_SELECTOR}`;
  const found = (el as any).closest?.(selector) as HTMLElement | null;
  if (!found) return null;
  const tokenId = readTokenId(found);
  if (tokenId) return { kind: 'token', id: tokenId };
  const kind = (found.getAttribute('data-kind') ?? '').trim();
  const id   = (found.getAttribute('data-id')   ?? '').trim();
  return kind && id ? { kind: kind as Target['kind'], id } : null;
}
