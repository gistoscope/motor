import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Window } from 'happy-dom';
import { readFile } from 'node:fs/promises';

describe('web demo tabs', () => {
  let domWindow: Window;

  beforeEach(() => {
    domWindow = new Window();
    globalThis.window = domWindow as unknown as typeof globalThis.window;
    globalThis.document = domWindow.document as unknown as typeof globalThis.document;
    globalThis.navigator = domWindow.navigator as unknown as typeof globalThis.navigator;
    (globalThis as any).HTMLElement = domWindow.HTMLElement;
    (globalThis as any).HTMLAnchorElement = domWindow.HTMLAnchorElement;
    (globalThis as any).Event = domWindow.Event;
    (globalThis as any).MouseEvent = domWindow.MouseEvent;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    delete (globalThis as any).MouseEvent;
    delete (globalThis as any).Event;
    delete (globalThis as any).HTMLAnchorElement;
    delete (globalThis as any).HTMLElement;
    delete (globalThis as any).navigator;
    delete (globalThis as any).document;
    delete (globalThis as any).window;
  });

  it('toggles between engine and graphs panels', async () => {
    const html = await readFile(new URL('../../web/demo/index.html', import.meta.url), 'utf8');

    document.open();
    document.write(html);
    document.close();

    document.querySelectorAll('script[type="module"]').forEach((script) => script.remove());

    await import('../../web/demo/tabs.mjs');

    const buttonEngine = document.querySelector('[data-tab="engine"]');
    const buttonGraphs = document.querySelector('[data-tab="graphs"]');
    const panelEngine = document.querySelector('[data-panel="engine"]');
    const panelGraphs = document.querySelector('[data-panel="graphs"]');

    expect(buttonEngine).not.toBeNull();
    expect(buttonGraphs).not.toBeNull();
    expect(panelEngine).not.toBeNull();
    expect(panelGraphs).not.toBeNull();

    expect(buttonEngine?.getAttribute('aria-selected')).toBe('false');
    expect(buttonGraphs?.getAttribute('aria-selected')).toBe('true');
    expect(panelEngine?.hidden).toBe(true);
    expect(panelGraphs?.hidden).toBe(false);

    buttonEngine?.dispatchEvent(new domWindow.MouseEvent('click', { bubbles: true }));

    expect(buttonEngine?.getAttribute('aria-selected')).toBe('true');
    expect(buttonGraphs?.getAttribute('aria-selected')).toBe('false');
    expect(panelEngine?.hidden).toBe(false);
    expect(panelGraphs?.hidden).toBe(true);

    buttonGraphs?.dispatchEvent(new domWindow.MouseEvent('click', { bubbles: true }));

    expect(buttonEngine?.getAttribute('aria-selected')).toBe('false');
    expect(buttonGraphs?.getAttribute('aria-selected')).toBe('true');
    expect(panelEngine?.hidden).toBe(true);
    expect(panelGraphs?.hidden).toBe(false);
  });
});
