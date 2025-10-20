/** @vitest-environment happy-dom */
export {};

import { Window } from 'happy-dom';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const resolveFixturePath = (metaUrl: string, relativePath: string) => {
  if (metaUrl.startsWith('file:')) {
    return resolve(dirname(fileURLToPath(metaUrl)), relativePath);
  }
  const parsed = new URL(metaUrl);
  if (parsed.protocol === 'http:' && parsed.pathname.startsWith('/@fs/')) {
    const basePath = decodeURIComponent(parsed.pathname.slice('/@fs/'.length));
    return resolve(basePath, relativePath);
  }
  throw new Error(`Unsupported import.meta.url protocol: ${parsed.protocol}`);
};

describe('demo tabs controller', () => {
  let domWindow: Window;

  const mountDocument = async (search = '') => {
    const htmlPath = resolveFixturePath(import.meta.url, '../../web/demo/index.html');
    const html = await readFile(htmlPath, 'utf8');
    const fileUrl = pathToFileURL(htmlPath);
    const targetUrl = new URL(fileUrl.href);
    if (search) {
      targetUrl.search = search.startsWith('?') ? search : `?${search}`;
    } else {
      targetUrl.search = '';
    }
    if (typeof domWindow.happyDOM?.setURL === 'function') {
      domWindow.happyDOM.setURL(targetUrl.href);
    } else {
      domWindow.location.href = targetUrl.href;
    }
    document.open();
    document.write(html);
    document.close();
    document.querySelector('script[type="module"][src="./main.js"]')?.remove();
    document.querySelector('script[type="module"][src="/demo/tabs.mjs"]')?.remove();
  };

  const bootstrapTabs = async () => {
    vi.resetModules();
    await import('../../web/demo/tabs.mjs');
    window.dispatchEvent(new Event('DOMContentLoaded'));
  };

  beforeEach(() => {
    domWindow = new Window();
    globalThis.window = domWindow as unknown as typeof window;
    globalThis.document = domWindow.document as unknown as typeof document;
    globalThis.navigator = domWindow.navigator as unknown as typeof navigator;
    (globalThis as any).HTMLElement = domWindow.HTMLElement;
    (globalThis as any).HTMLButtonElement = domWindow.HTMLButtonElement;
    (globalThis as any).Event = domWindow.Event;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
    delete (globalThis as any).Event;
    delete (globalThis as any).HTMLButtonElement;
    delete (globalThis as any).HTMLElement;
    delete (globalThis as any).navigator;
    delete (globalThis as any).document;
    delete (globalThis as any).window;
  });

  it('activates graphs pane by default and toggles to engine', async () => {
    await mountDocument('');
    await bootstrapTabs();

    const engineTab = document.querySelector<HTMLButtonElement>('[data-tab="engine"]');
    const graphsTab = document.querySelector<HTMLButtonElement>('[data-tab="graphs"]');
    const enginePane = document.querySelector<HTMLElement>('[data-pane="engine"]');
    const graphsPane = document.querySelector<HTMLElement>('[data-pane="graphs"]');

    expect(engineTab?.getAttribute('aria-selected')).toBe('false');
    expect(graphsTab?.getAttribute('aria-selected')).toBe('true');
    expect(enginePane?.hidden).toBe(true);
    expect(graphsPane?.hidden).toBe(false);

    engineTab?.click();

    expect(engineTab?.getAttribute('aria-selected')).toBe('true');
    expect(graphsTab?.getAttribute('aria-selected')).toBe('false');
    expect(enginePane?.hidden).toBe(false);
    expect(graphsPane?.hidden).toBe(true);
  });

  it('uses ?tab=engine initial state when present', async () => {
    await mountDocument('?tab=engine');
    await bootstrapTabs();

    const engineTab = document.querySelector<HTMLButtonElement>('[data-tab="engine"]');
    const graphsTab = document.querySelector<HTMLButtonElement>('[data-tab="graphs"]');
    const enginePane = document.querySelector<HTMLElement>('[data-pane="engine"]');
    const graphsPane = document.querySelector<HTMLElement>('[data-pane="graphs"]');

    expect(engineTab?.getAttribute('aria-selected')).toBe('true');
    expect(graphsTab?.getAttribute('aria-selected')).toBe('false');
    expect(enginePane?.hidden).toBe(false);
    expect(graphsPane?.hidden).toBe(true);
  });
});
