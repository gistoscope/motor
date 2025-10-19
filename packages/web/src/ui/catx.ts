export interface CatxRenderer {
  render: (...args: unknown[]) => unknown;
}

type CatxRendererCandidate = {
  render?: (...args: unknown[]) => unknown;
  default?: { render?: (...args: unknown[]) => unknown };
} | null | undefined;

export function findCatxRenderer(ownerWindow: Window | null): CatxRenderer | null {
  const candidate = (
    (ownerWindow as Window & { CATX?: unknown })?.CATX ??
    (globalThis as { CATX?: unknown }).CATX
  ) as CatxRendererCandidate;
  if (!candidate) {
    return null;
  }
  if (typeof candidate.render === 'function') {
    return candidate as CatxRenderer;
  }
  const fallback = candidate.default;
  if (fallback && typeof fallback.render === 'function') {
    return fallback as CatxRenderer;
  }
  return null;
}

export async function renderCatx(
  renderer: CatxRenderer,
  payload: { tex: string; ast: unknown; target: HTMLElement },
): Promise<boolean> {
  const { tex, ast, target } = payload;
  const attempts: Array<() => unknown> = [
    () => renderer.render({ latex: tex, ast, target }),
    () => renderer.render(tex, target, ast),
    () => renderer.render(tex, target),
    () => renderer.render(tex),
  ];
  for (const attempt of attempts) {
    try {
      const result = attempt();
      if (result && typeof (result as Promise<unknown>).then === 'function') {
        await (result as Promise<unknown>);
      }
      if (target.childElementCount > 0 || target.textContent?.trim()) {
        return true;
      }
      if (typeof result === 'string' && result.trim().length > 0) {
        target.innerHTML = result;
        return true;
      }
    } catch {
      // try next signature
    }
  }
  return false;
}
