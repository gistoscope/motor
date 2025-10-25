import { isHTMLElement } from '../util/dom';
import { withHtmlIds, defaultIdProvider } from './latexIds';

type KatexLike = {
  render: (tex: string, element: HTMLElement, options?: { throwOnError?: boolean }) => void;
};

const KATEX_READY_EVENT = 'katex:ready';
const KATEX_POLL_INTERVAL_MS = 150;
const KATEX_TIMEOUT_MS = 5000;

function getOwner(documentOrElement: Document | HTMLElement) {
  if (isHTMLElement(documentOrElement)) {
    const ownerDocument = documentOrElement.ownerDocument ?? document;
    return {
      document: ownerDocument,
      window: ownerDocument.defaultView ?? window,
    } as const;
  }
  const ownerDocument = documentOrElement;
  return {
    document: ownerDocument,
    window: ownerDocument.defaultView ?? window,
  } as const;
}

function getWindowKatex(ownerWindow: Window): KatexLike | null {
  const candidate = (ownerWindow as Window & { katex?: unknown }).katex;
  if (!candidate) {
    return null;
  }
  if (typeof (candidate as { render?: unknown }).render === 'function') {
    return candidate as KatexLike;
  }
  if (typeof (candidate as { default?: unknown }).default === 'object') {
    const nested = (candidate as { default?: { render?: unknown } }).default;
    if (nested && typeof nested.render === 'function') {
      return nested as KatexLike;
    }
  }
  return null;
}

async function waitForKatex(ownerDocument: Document, ownerWindow: Window, timeoutMs = KATEX_TIMEOUT_MS) {
  if (getWindowKatex(ownerWindow)) {
    return true;
  }

  return new Promise<boolean>((resolve) => {
    let settled = false;
    let intervalHandle: number | null = null;
    let timeoutHandle: number | null = null;

    const finish = (value: boolean) => {
      if (settled) {
        return;
      }
      settled = true;
      ownerDocument.removeEventListener(KATEX_READY_EVENT, handleReady);
      if (intervalHandle !== null) {
        ownerWindow.clearInterval(intervalHandle);
      }
      if (timeoutHandle !== null) {
        ownerWindow.clearTimeout(timeoutHandle);
      }
      resolve(value);
    };

    const handleReady = () => {
      const katex = getWindowKatex(ownerWindow);
      if (katex) {
        finish(true);
      }
    };

    ownerDocument.addEventListener(KATEX_READY_EVENT, handleReady);
    intervalHandle = ownerWindow.setInterval(() => {
      const katex = getWindowKatex(ownerWindow);
      if (katex) {
        finish(true);
      }
    }, KATEX_POLL_INTERVAL_MS);
    timeoutHandle = ownerWindow.setTimeout(() => {
      finish(getWindowKatex(ownerWindow) !== null);
    }, timeoutMs);
  });
}

function updateBadge(
  badgeEl: HTMLElement | undefined,
  message: string,
  tone: 'loading' | 'loaded' | 'fallback',
) {
  if (!badgeEl) {
    return;
  }
  badgeEl.textContent = message;
  badgeEl.dataset.tone = tone;
}

function clearBadgeTone(badgeEl: HTMLElement | undefined) {
  if (!badgeEl) {
    return;
  }
  delete badgeEl.dataset.tone;
}

function setFallbackContent(targetEl: HTMLElement, latex: string, plain: string) {
  targetEl.innerHTML = '';
  const fallback = plain || latex;
  if (fallback) {
    targetEl.textContent = fallback;
  } else {
    targetEl.textContent = '';
  }
}

export async function renderWithKaTeX(
  targetEl: HTMLElement,
  latex: string,
  plain: string,
  badgeEl?: HTMLElement,
): Promise<boolean> {
  const { document: ownerDocument, window: ownerWindow } = getOwner(targetEl);
  const trimmedLatex = latex?.trim() ?? '';
  const fallbackPlain = plain ?? '';

  let katex = getWindowKatex(ownerWindow);
  if (!katex) {
    updateBadge(badgeEl, 'KaTeX: loading', 'loading');
    const ready = await waitForKatex(ownerDocument, ownerWindow);
    if (!ready) {
      updateBadge(badgeEl, 'KaTeX: fallback', 'fallback');
      setFallbackContent(targetEl, trimmedLatex, fallbackPlain);
      return false;
    }
    katex = getWindowKatex(ownerWindow);
  }

  if (!katex) {
    updateBadge(badgeEl, 'KaTeX: fallback', 'fallback');
    setFallbackContent(targetEl, trimmedLatex, fallbackPlain);
    return false;
  }

  const content = trimmedLatex || fallbackPlain;
  if (!content) {
    targetEl.innerHTML = '';
    clearBadgeTone(badgeEl);
    return true;
  }

  try {
    const contentWithIds = withHtmlIds(content, defaultIdProvider);
    katex.render(contentWithIds, targetEl, {
      throwOnError: false,
      trust: (context) => context?.command === '\\htmlId' || context?.command === '\\htmlClass',
    });
    updateBadge(badgeEl, 'KaTeX: loaded', 'loaded');
    return true;
  } catch (error) {
    console.warn('[katex] Failed to render via KaTeX', error);
    updateBadge(badgeEl, 'KaTeX: fallback', 'fallback');
    setFallbackContent(targetEl, trimmedLatex, fallbackPlain);
    return false;
  }
}
