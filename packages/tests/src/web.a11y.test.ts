import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { Window } from 'happy-dom';

import { createViewer } from '../../web/src/viewer';

let domWindow: Window;

type ViewerSetup = {
  root: HTMLElement;
  handle: ReturnType<typeof createViewer>;
  clipboard: { writeText: ReturnType<typeof vi.fn> };
};

function focusElement(element: Element | null): void {
  if (!element) return;
  const maybeFocusable = element as Element & { focus?: () => void };
  if (typeof maybeFocusable.focus === 'function') {
    maybeFocusable.focus();
  } else {
    element.dispatchEvent(new domWindow.FocusEvent('focus') as unknown as Event);
  }
}

function blurElement(element: Element | null): void {
  if (!element) return;
  const maybeBlur = element as Element & { blur?: () => void };
  if (typeof maybeBlur.blur === 'function') {
    maybeBlur.blur();
  } else {
    element.dispatchEvent(new domWindow.FocusEvent('blur') as unknown as Event);
  }
}

function setup(options: { initialJSON?: string } = {}): ViewerSetup {
  const clipboard = {
    writeText: vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined),
  };
  const root = document.createElement('div');
  document.body.appendChild(root);
  const handle = createViewer(root, { ...options, clipboard });
  return { root, handle, clipboard };
}

beforeEach(() => {
  domWindow = new Window();
  globalThis.window = domWindow as unknown as typeof globalThis.window;
  globalThis.document = domWindow.document as unknown as typeof globalThis.document;
  globalThis.navigator = domWindow.navigator as unknown as typeof globalThis.navigator;
  globalThis.HTMLElement = domWindow.HTMLElement as unknown as typeof globalThis.HTMLElement;
  globalThis.SVGElement = domWindow.SVGElement as unknown as typeof globalThis.SVGElement;
  globalThis.Event = domWindow.Event as unknown as typeof globalThis.Event;
  globalThis.CustomEvent = domWindow.CustomEvent as unknown as typeof globalThis.CustomEvent;
  globalThis.KeyboardEvent = domWindow.KeyboardEvent as unknown as typeof globalThis.KeyboardEvent;
  globalThis.MouseEvent = domWindow.MouseEvent as unknown as typeof globalThis.MouseEvent;
  globalThis.FocusEvent = domWindow.FocusEvent as unknown as typeof globalThis.FocusEvent;
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  delete (globalThis as any).window;
  delete (globalThis as any).document;
  delete (globalThis as any).navigator;
  delete (globalThis as any).HTMLElement;
  delete (globalThis as any).SVGElement;
  delete (globalThis as any).Event;
  delete (globalThis as any).CustomEvent;
  delete (globalThis as any).KeyboardEvent;
  delete (globalThis as any).MouseEvent;
  delete (globalThis as any).FocusEvent;
});

describe('web viewer accessibility', () => {
  it('adds roles, labels, and focus classes to nodes and edges', () => {
    const sample = {
      nodes: [
        { id: 'A', label: 'Alpha' },
        { id: 'B', label: 'Beta' },
      ],
      edges: [
        { from: 'A', to: 'B' },
      ],
    };

    const { root, handle } = setup();
    const textarea = root.querySelector<HTMLTextAreaElement>('textarea[data-role="input"]');
    const parseButton = root.querySelector<HTMLButtonElement>('button[data-action="parse"]');
    expect(textarea).toBeTruthy();
    expect(parseButton).toBeTruthy();
    textarea!.value = JSON.stringify(sample, null, 2);
    parseButton!.click();

    const node = root.querySelector<SVGGElement>('g.motor-node');
    expect(node).toBeTruthy();
    expect(node?.getAttribute('tabindex')).toBe('0');
    expect(node?.getAttribute('role')).toBe('button');
    expect(node?.getAttribute('aria-label')).toBe('Node A');

    focusElement(node ?? null);
    expect(node?.classList.contains('motor-node--focus')).toBe(true);
    blurElement(node ?? null);
    expect(node?.classList.contains('motor-node--focus')).toBe(false);

    const edge = root.querySelector<SVGPathElement>('path.motor-edge');
    expect(edge).toBeTruthy();
    expect(edge?.getAttribute('tabindex')).toBe('0');
    expect(edge?.getAttribute('role')).toBe('img');
    expect(edge?.getAttribute('aria-label')).toBe('Edge A→B');

    focusElement(edge ?? null);
    expect(edge?.classList.contains('motor-edge--focus')).toBe(true);
    blurElement(edge ?? null);
    expect(edge?.classList.contains('motor-edge--focus')).toBe(false);

    handle.destroy();
  });

  it('toggles help overlay from toolbar and keyboard', () => {
    const { root, handle } = setup();
    const helpButton = root.querySelector<HTMLButtonElement>('button[data-action="open-help"]');
    const overlay = root.querySelector<HTMLElement>('.motor-help-overlay');
    const viewerRoot = root.querySelector<HTMLElement>('[data-role="viewer-root"]');
    expect(helpButton).toBeTruthy();
    expect(overlay).toBeTruthy();
    expect(viewerRoot).toBeTruthy();
    expect(overlay?.dataset.state).toBe('hidden');

    helpButton!.click();
    expect(overlay?.dataset.state).toBe('visible');
    expect(helpButton?.getAttribute('aria-expanded')).toBe('true');

    const closeButton = overlay?.querySelector<HTMLButtonElement>('.motor-help-overlay__close');
    closeButton?.dispatchEvent(
      new domWindow.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }) as unknown as Event,
    );
    expect(overlay?.dataset.state).toBe('hidden');
    expect(helpButton?.getAttribute('aria-expanded')).toBe('false');

    if (typeof helpButton?.focus === 'function') {
      helpButton.focus();
    }

    const withHooks = viewerRoot as typeof viewerRoot & {
      __motorHelpKeydown?: (event: KeyboardEvent) => void;
    };
    expect(typeof withHooks.__motorHelpKeydown).toBe('function');
    withHooks.__motorHelpKeydown?.(
      new domWindow.KeyboardEvent('keydown', { key: '/', shiftKey: true }) as unknown as KeyboardEvent,
    );
    expect(overlay?.dataset.state).toBe('visible');
    expect(helpButton?.getAttribute('aria-expanded')).toBe('true');

    handle.destroy();
  });

  it('switches high-contrast mode using the toolbar checkbox', () => {
    const { root, handle } = setup();
    const viewerRoot = root.querySelector<HTMLElement>('[data-role="viewer-root"]');
    const contrastToggle = root.querySelector<HTMLInputElement>('input[data-role="contrast-toggle"]');
    expect(viewerRoot).toBeTruthy();
    expect(contrastToggle).toBeTruthy();

    expect(viewerRoot?.classList.contains('motor-contrast--high')).toBe(false);
    contrastToggle!.checked = true;
    contrastToggle!.dispatchEvent(new domWindow.Event('change', { bubbles: true }) as unknown as Event);
    expect(viewerRoot?.classList.contains('motor-contrast--high')).toBe(true);

    contrastToggle!.checked = false;
    contrastToggle!.dispatchEvent(new domWindow.Event('change', { bubbles: true }) as unknown as Event);
    expect(viewerRoot?.classList.contains('motor-contrast--high')).toBe(false);

    handle.destroy();
  });
});
