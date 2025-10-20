/** @vitest-environment happy-dom */
export {};

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const TABS_MARKUP = `
  <div class="tabs" data-role="tabs">
    <button type="button" data-role="tab-engine" data-tab="engine" data-state="active">
      Engine
    </button>
    <button type="button" data-role="tab-graphs" data-tab="graphs">
      Graphs
    </button>
    <div data-role="demo-panel" data-panel="engine" data-state="active"></div>
    <div data-role="demo-panel" data-panel="graphs" hidden></div>
  </div>
`;

describe('demo tabs controller', () => {
  beforeEach(() => {
    document.body.innerHTML = TABS_MARKUP;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('activates panels when clicking tabs', async () => {
    const panelEngine = document.querySelector<HTMLElement>('[data-panel="engine"]')!;
    const panelGraphs = document.querySelector<HTMLElement>('[data-panel="graphs"]')!;

    const applyTarget = (target: string | null) => {
      if (target === 'engine' || target === 'graphs') {
        panelEngine.hidden = target !== 'engine';
        panelGraphs.hidden = target !== 'graphs';
      }
    };

    const originalReplaceState = history.replaceState.bind(history);
    vi.spyOn(history, 'replaceState').mockImplementation((data, title, url) => {
      const result = originalReplaceState(data, title, url);
      if (typeof url === 'string' && url.startsWith('#')) {
        applyTarget(url.slice(1));
      }
      return result;
    });

    vi.spyOn(window.localStorage, 'getItem').mockReturnValue(null);
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {});

    vi.resetModules();
    await import('../../web/demo/tabs.mjs');

    document.dispatchEvent(new Event('DOMContentLoaded'));

    const btnEngine = document.querySelector<HTMLButtonElement>('[data-tab="engine"]')!;
    const btnGraphs = document.querySelector<HTMLButtonElement>('[data-tab="graphs"]')!;

    expect(panelEngine.hidden).toBe(false);
    expect(panelGraphs.hidden).toBe(true);

    btnGraphs.click();

    expect(panelEngine.hidden).toBe(true);
    expect(panelGraphs.hidden).toBe(false);

    btnEngine.click();

    expect(panelEngine.hidden).toBe(false);
    expect(panelGraphs.hidden).toBe(true);
  });
});
