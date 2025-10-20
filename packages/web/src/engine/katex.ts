export interface KatexModule {
  render(tex: string, element: HTMLElement, options?: { throwOnError?: boolean }): void;
}

let cachedPromise: Promise<KatexModule | null> | null = null;

async function loadModule(): Promise<KatexModule | null> {
  try {
    const mod = await import('../../vendor/katex/katex.mjs');
    const candidate = (mod as { default?: KatexModule }).default ?? (mod as KatexModule);
    if (candidate && typeof candidate.render === 'function') {
      await import('../../vendor/katex/katex.css');
      return candidate;
    }
  } catch (error) {
    console.warn('[engine-pane] Failed to load KaTeX vendor', error);
  }
  return null;
}

export function getKatexModule(): Promise<KatexModule | null> {
  if (!cachedPromise) {
    cachedPromise = loadModule();
  }
  return cachedPromise;
}

export async function renderWithKatex(
  tex: string,
  element: HTMLElement,
  options: { throwOnError?: boolean } = { throwOnError: false },
): Promise<boolean> {
  const module = await getKatexModule();
  if (!module) {
    return false;
  }
  try {
    module.render(tex, element, options);
    return true;
  } catch (error) {
    if (options.throwOnError) {
      throw error;
    }
    console.warn('[engine-pane] KaTeX render failed', error);
    return false;
  }
}
