import { renderWithKaTeX } from '../engine/katex';
import { findCatxRenderer, renderCatx, type CatxRenderer } from './catx';
import installHoverPainter from './hover.painter.js';
import { clear as clearSelection, select } from './selection';

function renderTokenFallback(container: HTMLElement, expression: string): void {
  container.textContent = '';
  const tokens = expression.match(/[^\s]+/gu) ?? [];
  if (tokens.length === 0) {
    container.textContent = '∅';
    return;
  }
  const fragment = container.ownerDocument.createDocumentFragment();
  tokens.forEach((token, index) => {
    const span = container.ownerDocument.createElement('span');
    span.dataset.role = 'math-fallback-token';
    span.textContent = token;
    if (index < tokens.length - 1) {
      span.insertAdjacentText('afterend', ' ');
    }
    fragment.appendChild(span);
  });
  container.appendChild(fragment);
}

interface PlaygroundDisplayElements {
  root: HTMLElement;
  catxContainer: HTMLElement;
  fallbackContainer: HTMLElement;
  fallbackHtml: HTMLElement;
}

export interface PlaygroundDisplayRenderPayload {
  tex?: string;
  html?: string;
  plain?: string;
  ast: unknown;
}

export interface PlaygroundDisplayHandle {
  render(payload: PlaygroundDisplayRenderPayload): Promise<void>;
  preview(expression: string): Promise<void>;
  destroy(): void;
}

export function createPlaygroundDisplay({
  root,
  catxContainer,
  fallbackContainer,
  fallbackHtml,
}: PlaygroundDisplayElements): PlaygroundDisplayHandle {
  const ownerDocument = root.ownerDocument ?? document;
  const ownerWindow = ownerDocument.defaultView ?? window;
  const badge =
    root.querySelector<HTMLElement>('[data-role="math-display-katex-badge"]') ??
    ownerDocument.createElement('span');
  if (!badge.dataset.role) {
    badge.dataset.role = 'math-display-katex-badge';
    badge.classList.add('math-playground__display-badge', 'katex-badge');
    badge.textContent = 'KaTeX: loading';
    badge.dataset.tone = 'loading';
    root.appendChild(badge);
  }

  let destroyed = false;
  let renderSequence = 0;
  let catxRenderer: CatxRenderer | null = null;
  let lastPayload: PlaygroundDisplayRenderPayload | null = null;
  let lastPreview: string | null = null;
  let uninstallHover: (() => void) | null = null;
  let uninstallSelection: (() => void) | null = null;

  const setHoverPainterReady = (ready: boolean) => {
    (ownerWindow as typeof ownerWindow & { __hoverPainterReady?: boolean }).__hoverPainterReady = ready;
  };

  const teardownHoverPainter = () => {
    if (uninstallHover) {
      uninstallHover();
      uninstallHover = null;
    }
    setHoverPainterReady(false);
  };

  const mountHoverPainter = () => {
    const getRoot = () =>
      catxContainer.querySelector<HTMLElement>('.katex .katex-html') ??
      catxContainer.querySelector<HTMLElement>('.katex-html');
    const root = getRoot();
    teardownHoverPainter();
    uninstallHover = installHoverPainter({
      getRoot,
      devLog: false,
    });
    setHoverPainterReady(Boolean(root));
  };

  const ensureCatxRenderer = (): CatxRenderer | null => {
    if (!catxRenderer) {
      catxRenderer = findCatxRenderer(ownerWindow);
    }
    return catxRenderer;
  };

  const setBadge = (message: string, tone: 'loading' | 'loaded' | 'fallback') => {
    badge.textContent = message;
    badge.dataset.tone = tone;
  };

  const resetContainers = () => {
    teardownHoverPainter();
    if (uninstallSelection) {
      uninstallSelection();
      uninstallSelection = null;
    }
    clearSelection();
    catxContainer.dataset.state = 'idle';
    catxContainer.innerHTML = '';
    fallbackContainer.dataset.mode = 'fallback';
    fallbackHtml.innerHTML = '';
  };

  const takeTokIdFromPath = (event: Event, root: Element): string | null => {
    const rawPath =
      typeof (event as { composedPath?: () => EventTarget[] }).composedPath === 'function'
        ? (event as { composedPath: () => EventTarget[] }).composedPath()
        : [];
    const fallbackPath = () => {
      const target = event.target;
      const acc: EventTarget[] = [];
      if (target instanceof Element) {
        for (let el: Element | null = target; el; el = el.parentElement) {
          acc.push(el);
        }
      }
      return acc;
    };
    const path = rawPath && rawPath.length > 0 ? rawPath : fallbackPath();
    for (const el of path) {
      if (!(el instanceof Element)) continue;
      if (!root.contains(el)) continue;
      const id = (el as HTMLElement).id || '';
      if (id.startsWith('tok:')) {
        return id;
      }
    }
    return null;
  };

  const mountSelectionHandlers = () => {
    const getRoot = () =>
      catxContainer.querySelector<HTMLElement>('.katex .katex-html') ??
      catxContainer.querySelector<HTMLElement>('.katex-html');
    const root = getRoot();
    if (uninstallSelection) {
      uninstallSelection();
      uninstallSelection = null;
    }
    if (!root) {
      return;
    }
    const onClick = (event: MouseEvent) => {
      const tokId = takeTokIdFromPath(event, root);
      if (!tokId) {
        return;
      }
      select(tokId);
    };
    root.addEventListener('click', onClick);
    uninstallSelection = () => {
      root.removeEventListener('click', onClick);
    };
  };

  const applyFallback = (expression: string, htmlOutput: string | undefined) => {
    fallbackContainer.dataset.mode = 'fallback';
    if (htmlOutput && htmlOutput.trim()) {
      fallbackHtml.innerHTML = htmlOutput;
    } else {
      renderTokenFallback(fallbackHtml, expression);
    }
    setBadge('KaTeX: fallback', 'fallback');
  };

  const render = async (payload: PlaygroundDisplayRenderPayload): Promise<void> => {
    const sequence = ++renderSequence;
    lastPayload = payload;
    lastPreview = null;
    resetContainers();

    const trimmedTex = payload.tex?.trim() ?? '';
    const plain = payload.plain ?? trimmedTex;
    const htmlOutput = payload.html?.trim() ? payload.html : undefined;

    const renderer = ensureCatxRenderer();
    if (renderer && trimmedTex) {
      const success = await renderCatx(renderer, {
        tex: trimmedTex,
        ast: payload.ast,
        target: catxContainer,
      }).catch(() => false);
      if (destroyed || sequence !== renderSequence) {
        return;
      }
      if (success && (catxContainer.childElementCount > 0 || catxContainer.textContent?.trim())) {
        catxContainer.dataset.state = 'ready';
        fallbackContainer.dataset.mode = htmlOutput ? 'shadow' : 'fallback';
        setBadge('KaTeX: loaded', 'loaded');
        return;
      }
      catxContainer.dataset.state = 'error';
    }

    const katexSuccess = await renderWithKaTeX(catxContainer, trimmedTex, plain, badge);
    if (destroyed || sequence !== renderSequence) {
      return;
    }
    if (katexSuccess && (catxContainer.childElementCount > 0 || catxContainer.textContent?.trim())) {
      catxContainer.dataset.state = 'ready';
      fallbackContainer.dataset.mode = htmlOutput ? 'shadow' : 'fallback';
      mountHoverPainter();
      mountSelectionHandlers();
      return;
    }

    applyFallback(plain || trimmedTex, htmlOutput);
  };

  const preview = async (expression: string): Promise<void> => {
    const sequence = ++renderSequence;
    lastPreview = expression;
    resetContainers();

    const trimmed = expression.trim();
    if (!trimmed) {
      applyFallback('', undefined);
      return;
    }

    const success = await renderWithKaTeX(catxContainer, trimmed, expression, badge);
    if (destroyed || sequence !== renderSequence) {
      return;
    }
    if (success && (catxContainer.childElementCount > 0 || catxContainer.textContent?.trim())) {
      catxContainer.dataset.state = 'ready';
      fallbackContainer.dataset.mode = 'shadow';
      mountHoverPainter();
      mountSelectionHandlers();
      return;
    }

    applyFallback(expression, undefined);
  };

  const handleKatexReady = () => {
    if (destroyed) {
      return;
    }
    if (lastPayload) {
      void render(lastPayload);
      return;
    }
    if (lastPreview !== null) {
      void preview(lastPreview);
    }
  };

  ownerDocument.addEventListener('katex:ready', handleKatexReady);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      clearSelection();
    }
  };

  root.addEventListener('keydown', onKeyDown);

  const destroy = () => {
    if (destroyed) {
      return;
    }
    destroyed = true;
    ownerDocument.removeEventListener('katex:ready', handleKatexReady);
    teardownHoverPainter();
    if (uninstallSelection) {
      uninstallSelection();
      uninstallSelection = null;
    }
    clearSelection();
    root.removeEventListener('keydown', onKeyDown);
  };

  return { render, preview, destroy };
}
