export interface KatexTrustContext {
  readonly command: string;
}

export type KatexStrictResult = 'ignore' | 'warn' | 'error';

export interface KatexRenderConfig {
  throwOnError?: boolean;
  trust?: boolean | ((context: KatexTrustContext) => boolean);
  strict?:
    | boolean
    | KatexStrictResult
    | ((errorCode: string, errorMsg?: string, token?: unknown) => KatexStrictResult);
}

export interface KatexModule {
  render(tex: string, element: HTMLElement, options?: KatexRenderConfig): void;
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

export interface RenderWithKatexOptions {
  throwOnError?: boolean;
  trustHtml?: boolean;
}

const TRUSTED_COMMANDS = new Set(['\\htmlId', '\\htmlClass']);

function createRenderConfig(options: RenderWithKatexOptions): KatexRenderConfig {
  const throwOnError = options.throwOnError ?? false;
  if (!options.trustHtml) {
    return { throwOnError };
  }

  return {
    throwOnError,
    trust: (context: KatexTrustContext) => TRUSTED_COMMANDS.has(context.command),
    strict: (errorCode: string): KatexStrictResult =>
      errorCode === 'htmlExtension' ? 'ignore' : 'warn',
  };
}

export async function renderWithKatex(
  tex: string,
  element: HTMLElement,
  options: RenderWithKatexOptions = {},
): Promise<boolean> {
  const module = await getKatexModule();
  if (!module) {
    return false;
  }
  try {
    const renderOptions = createRenderConfig(options);
    module.render(tex, element, renderOptions);
    return true;
  } catch (error) {
    if (options.throwOnError) {
      throw error;
    }
    console.warn('[engine-pane] KaTeX render failed', error);
    return false;
  }
}
