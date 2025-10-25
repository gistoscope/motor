import type { Target } from './ids';
export function pickTarget(el: Element | null): Target | null {
  if (!el) return null;
  const found = (el as any).closest?.('[data-kind][data-id], [data-token-id]') as HTMLElement | null;
  if (!found) return null;
  const legacyToken = found.getAttribute('data-token-id');
  if (legacyToken) return { kind: 'token', id: legacyToken };
  const kind = (found.getAttribute('data-kind') ?? '').trim();
  const id   = (found.getAttribute('data-id')   ?? '').trim();
  return kind && id ? { kind: kind as Target['kind'], id } : null;
}
