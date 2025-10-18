import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { Window } from 'happy-dom';

import { createViewer } from '../../web/src/viewer';

type DownloadRecord = { name: string; blob: Blob };

let domWindow: Window;
let downloads: DownloadRecord[];
let objectURLs: Map<string, Blob>;
let originalWindow: typeof globalThis.window | undefined;
let originalDocument: typeof globalThis.document | undefined;
let originalNavigator: typeof globalThis.navigator | undefined;
let originalURL: typeof globalThis.URL | undefined;
let originalBlob: typeof globalThis.Blob | undefined;

function setup(options: { initialJSON?: string } = {}) {
  const clipboard = {
    writeText: vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined),
  };
  const root = document.createElement('div');
  document.body.appendChild(root);
  const handle = createViewer(root, { ...options, clipboard });
  return { root, clipboard, handle };
}

beforeEach(() => {
  domWindow = new Window();
  downloads = [];
  objectURLs = new Map();
  originalWindow = globalThis.window;
  originalDocument = globalThis.document;
  originalNavigator = globalThis.navigator;
  originalURL = globalThis.URL;
  originalBlob = globalThis.Blob;
  globalThis.window = domWindow as unknown as typeof globalThis.window;
  globalThis.document = domWindow.document as unknown as typeof globalThis.document;
  globalThis.navigator = domWindow.navigator as unknown as typeof globalThis.navigator;
  globalThis.Blob = domWindow.Blob as unknown as typeof globalThis.Blob;
  vi.spyOn(domWindow.URL, 'createObjectURL').mockImplementation((object: unknown) => {
    const blob = object as Blob;
    const href = `blob:test-${objectURLs.size}`;
    objectURLs.set(href, blob);
    return href;
  });
  vi.spyOn(domWindow.URL, 'revokeObjectURL').mockImplementation((href: string) => {
    objectURLs.delete(href);
  });
  globalThis.URL = domWindow.URL as unknown as typeof globalThis.URL;
  vi.spyOn(domWindow.HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    const blob = objectURLs.get(this.href);
    if (blob) {
      downloads.push({ name: this.download, blob });
    }
  });
});

afterEach(() => {
  if (typeof document !== 'undefined') {
    document.body.innerHTML = '';
  }
  downloads = [];
  objectURLs.clear();
  vi.restoreAllMocks();
  if (originalWindow !== undefined) {
    globalThis.window = originalWindow;
  } else {
    delete (globalThis as any).window;
  }
  if (originalDocument !== undefined) {
    globalThis.document = originalDocument;
  } else {
    delete (globalThis as any).document;
  }
  if (originalNavigator !== undefined) {
    globalThis.navigator = originalNavigator;
  } else {
    delete (globalThis as any).navigator;
  }
  if (originalURL !== undefined) {
    globalThis.URL = originalURL;
  } else {
    delete (globalThis as any).URL;
  }
  if (originalBlob !== undefined) {
    globalThis.Blob = originalBlob;
  } else {
    delete (globalThis as any).Blob;
  }
});

describe('web viewer import/export', () => {
  it('pastes valid JSON and renders graph', async () => {
    const sample = {
      nodes: [
        { id: 'X', label: 'Start' },
        { id: 'Y', label: 'Finish' },
      ],
      edges: [{ from: 'X', to: 'Y' }],
    };

    const { root } = setup();

    const pasteButton = root.querySelector<HTMLButtonElement>('button[data-action="paste-open"]');
    expect(pasteButton).toBeTruthy();
    pasteButton!.click();

    const panel = root.querySelector<HTMLElement>('[data-role="paste-panel"]');
    expect(panel?.dataset.state).toBe('visible');

    const pasteTextarea = root.querySelector<HTMLTextAreaElement>('textarea[data-role="paste-textarea"]');
    expect(pasteTextarea).toBeTruthy();
    pasteTextarea!.value = JSON.stringify(sample, null, 2);

    const applyButton = root.querySelector<HTMLButtonElement>('button[data-action="paste-apply"]');
    expect(applyButton).toBeTruthy();
    applyButton!.click();

    await vi.waitFor(() => {
      const nodesValue = root.querySelector('[data-role="stats-nodes"]')?.textContent?.trim();
      expect(nodesValue).toBe('2');
    });

    const edgesValue = root.querySelector('[data-role="stats-edges"]')?.textContent?.trim();
    expect(edgesValue).toBe('1');

    const dotOutput = root.querySelector('[data-role="dot-output"]')?.textContent ?? '';
    const inspectOutput = root.querySelector('[data-role="inspect-output"]')?.textContent ?? '';
    expect(dotOutput).toContain('digraph');
    expect(dotOutput.endsWith('\n')).toBe(true);
    expect(inspectOutput).toContain('nodes:');
    expect(inspectOutput.endsWith('\n')).toBe(true);

    expect(panel?.dataset.state).toBe('hidden');
  });

  it('shows validation error for invalid pasted JSON', async () => {
    const { root } = setup();

    const pasteButton = root.querySelector<HTMLButtonElement>('button[data-action="paste-open"]');
    pasteButton!.click();

    const pasteTextarea = root.querySelector<HTMLTextAreaElement>('textarea[data-role="paste-textarea"]');
    pasteTextarea!.value = '{ invalid';

    const applyButton = root.querySelector<HTMLButtonElement>('button[data-action="paste-apply"]');
    applyButton!.click();

    await vi.waitFor(() => {
      const errors = root.querySelector('[data-role="errors"]')?.textContent ?? '';
      expect(errors).toContain('Invalid JSON');
    });

    const panel = root.querySelector<HTMLElement>('[data-role="paste-panel"]');
    expect(panel?.dataset.state).toBe('visible');
  });

  it('imports graph JSON from file input', async () => {
    const sample = {
      nodes: [
        { id: 'A', label: 'Alpha' },
        { id: 'B', label: 'Beta' },
      ],
      edges: [{ from: 'A', to: 'B' }],
    };

    const { root } = setup();

    const importInput = root.querySelector<HTMLInputElement>('input[data-role="import-input"]');
    expect(importInput).toBeTruthy();
    const file = new domWindow.File([JSON.stringify(sample, null, 2)], 'graph.json', {
      type: 'application/json',
    });

    Object.defineProperty(importInput!, 'files', {
      configurable: true,
      get: () => ({
        0: file,
        length: 1,
        item: (index: number) => (index === 0 ? file : null),
      }),
    });

    importInput!.dispatchEvent(new window.Event('change'));

    await vi.waitFor(() => {
      const nodesValue = root.querySelector('[data-role="stats-nodes"]')?.textContent?.trim();
      expect(nodesValue).toBe('2');
    });

    const textarea = root.querySelector<HTMLTextAreaElement>('textarea[data-role="input"]');
    expect(textarea?.value.endsWith('\n')).toBe(true);
  });

  it('downloads JSON and DOT exports with trailing newline', async () => {
    const sample = {
      nodes: [
        { id: 'A', label: 'One' },
        { id: 'B', label: 'Two' },
      ],
      edges: [{ from: 'A', to: 'B' }],
    };

    const { root } = setup({ initialJSON: JSON.stringify(sample) });

    await vi.waitFor(() => {
      const dotOutput = root.querySelector('[data-role="dot-output"]')?.textContent ?? '';
      expect(dotOutput).toContain('digraph');
    });

    const downloadJSON = root.querySelector<HTMLButtonElement>('button[data-target="json"][data-action="download"]');
    const downloadDOT = root.querySelector<HTMLButtonElement>('button[data-target="dot"][data-action="download"]');
    expect(downloadJSON).toBeTruthy();
    expect(downloadDOT).toBeTruthy();

    downloadJSON!.click();
    downloadDOT!.click();

    await vi.waitFor(() => {
      expect(downloads.find((record) => record.name === 'graph.json')).toBeTruthy();
      expect(downloads.find((record) => record.name === 'graph.dot')).toBeTruthy();
    });

    const jsonDownload = downloads.find((record) => record.name === 'graph.json');
    const dotDownload = downloads.find((record) => record.name === 'graph.dot');
    expect(jsonDownload).toBeTruthy();
    expect(dotDownload).toBeTruthy();
    const jsonText = await jsonDownload!.blob.text();
    const dotText = await dotDownload!.blob.text();
    expect(jsonText.endsWith('\n')).toBe(true);
    expect(dotText.endsWith('\n')).toBe(true);
    expect(dotText.trim()).toContain('digraph');
  });
});
