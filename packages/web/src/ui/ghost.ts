import { queryTokenElements } from '../util/tokenAnchors';

interface RectLike {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface GhostOverlayHandle {
  readonly element: HTMLElement;
  render(tokenIds: Iterable<string>): void;
  clear(): void;
  destroy(): void;
}

function dedupeIds(ids: Iterable<string>): string[] {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (!seen.has(id)) {
      seen.add(id);
      unique.push(id);
    }
  }
  return unique;
}

function computeTokenRects(host: HTMLElement, tokenId: string): RectLike[] {
  const nodes = queryTokenElements(host, tokenId);
  const rects: RectLike[] = [];
  for (const node of nodes) {
    const nodeRects = Array.from(node.getClientRects());
    if (nodeRects.length > 0) {
      rects.push(...nodeRects);
    } else {
      const fallback = node.getBoundingClientRect();
      rects.push(fallback);
      if ((fallback.width === 0 || Number.isNaN(fallback.width)) && node.offsetWidth !== undefined) {
        rects.push({
          top: node.offsetTop,
          left: node.offsetLeft,
          width: node.offsetWidth,
          height: node.offsetHeight,
        });
      }
    }
  }
  return rects;
}

export function createGhostOverlay(host: HTMLElement): GhostOverlayHandle {
  const ownerDocument = host.ownerDocument ?? document;
  const ownerWindow = ownerDocument.defaultView ?? window;
  const overlay = ownerDocument.createElement('div');
  overlay.className = 'motor-ghost';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.dataset.state = 'hidden';
  host.appendChild(overlay);

  const render = (tokenIds: Iterable<string>) => {
    const ids = dedupeIds(tokenIds);
    overlay.textContent = '';
    if (ids.length === 0) {
      overlay.dataset.state = 'hidden';
      return;
    }

    const referenceRect = host.getBoundingClientRect();
    for (const id of ids) {
      const rects = computeTokenRects(host, id);
      for (const rect of rects) {
        const box = ownerDocument.createElement('div');
        box.className = 'motor-ghost__token';
        box.dataset.role = 'motor-ghost-token';
        box.dataset.tokenId = id;
        const top = rect.top - referenceRect.top + host.scrollTop;
        const left = rect.left - referenceRect.left + host.scrollLeft;
        box.style.top = `${Math.max(0, top)}px`;
        box.style.left = `${Math.max(0, left)}px`;
        box.style.width = `${Math.max(0, rect.width)}px`;
        box.style.height = `${Math.max(0, rect.height)}px`;
        overlay.appendChild(box);
      }
    }

    overlay.dataset.state = overlay.childElementCount > 0 ? 'visible' : 'hidden';
  };

  const clear = () => {
    overlay.textContent = '';
    overlay.dataset.state = 'hidden';
  };

  const destroy = () => {
    clear();
    if (overlay.parentElement === host) {
      overlay.remove();
    }
  };

  ownerWindow.requestAnimationFrame(() => {
    overlay.dataset.ready = 'true';
  });

  return { element: overlay, render, clear, destroy };
}
