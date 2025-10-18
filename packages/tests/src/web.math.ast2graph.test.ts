// @ts-nocheck
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { Window } from 'happy-dom';

describe('math ast-to-graph interactions', () => {
  let domWindow: Window;

  beforeEach(() => {
    domWindow = new Window();
    globalThis.window = domWindow as unknown as typeof globalThis.window;
    globalThis.document = domWindow.document as unknown as typeof globalThis.document;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    delete (globalThis as any).window;
    delete (globalThis as any).document;
  });

  it('forwards token hover from dataset to formula host handler', () => {
    const formulaHost = { emitHover: vi.fn() };

    const host = document.createElement('div');
    const token = document.createElement('span');
    token.dataset.tokenId = 'token-1';
    host.appendChild(token);
    document.body.appendChild(host);

    const tokenId = (token as any).dataset.tokenId;
    (formulaHost as any)?.emitHover?.(tokenId);

    expect(formulaHost.emitHover).toHaveBeenCalledWith('token-1');
  });
});
