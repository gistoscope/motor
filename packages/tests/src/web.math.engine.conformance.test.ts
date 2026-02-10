// @ts-nocheck

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Window } from 'happy-dom';

import { fromRealEngine } from '../../web/src/math/engineAdapter';

let domWindow: Window;

beforeEach(() => {
  domWindow = new Window();
});

afterEach(() => {
  if (domWindow) {
    domWindow.close?.();
  }
});

function createHost(): HTMLElement {
  return domWindow.document.createElement('div');
}

function createEvents() {
  const listeners = new Map<string, Set<(payload: unknown) => void>>();
  const on = vi.fn((event: string, cb: (payload: unknown) => void) => {
    let bucket = listeners.get(event);
    if (!bucket) {
      bucket = new Set();
      listeners.set(event, bucket);
    }
    bucket.add(cb);
  });
  const off = vi.fn((event: string, cb: (payload: unknown) => void) => {
    const bucket = listeners.get(event);
    if (!bucket) {
      return;
    }
    bucket.delete(cb);
    if (bucket.size === 0) {
      listeners.delete(event);
    }
  });
  const emit = (event: string, payload: unknown) => {
    const bucket = listeners.get(event);
    if (!bucket) {
      return;
    }
    for (const cb of bucket) {
      cb(payload);
    }
  };
  const get = (event: string) => Array.from(listeners.get(event) ?? []);
  return { on, off, emit, get };
}

describe('web.math.engine.conformance', () => {
  it('mount tries multiple signatures and never throws when the real engine rejects them', () => {
    const attempts: unknown[] = [];
    let capturedHost: HTMLElement | null = null;
    const real = {
      mount: vi.fn((host: HTMLElement, initial: unknown) => {
        capturedHost = host;
        attempts.push(initial);
        if (typeof initial === 'string') {
          throw new Error('signature mismatch');
        }
      }),
      state: { legalActions: [] },
    };
    const engine = fromRealEngine(real);
    const host = createHost();

    expect(() => engine.mount(host, 'x + y')).not.toThrow();
    expect(real.mount).toHaveBeenCalledTimes(2);
    expect(capturedHost).toBe(host);
    expect(attempts).toEqual(['x + y', { expression: 'x + y' }]);

    const stubborn = {
      mount: vi.fn(() => {
        throw new Error('still wrong');
      }),
      state: { legalActions: [] },
    };
    const stubbornEngine = fromRealEngine(stubborn);

    expect(() => stubbornEngine.mount(createHost(), 'z')).not.toThrow();
    expect(stubborn.mount).toHaveBeenCalledTimes(3);
  });

  it('normalizes legal actions from a variety of real-engine shapes', () => {
    const real = {
      mount: vi.fn(),
      state: {
        legalActions: [
          'alpha',
          42,
          { label: 'Beta', kind: 'special' },
          { id: 'gamma', label: 'Gamma', kind: 'custom' },
        ],
      },
    };
    const engine = fromRealEngine(real);

    engine.mount(createHost(), 'expr');
    expect(engine.getLegalActions()).toEqual([
      { id: 'alpha', label: 'alpha', kind: 'action' },
      { id: '42', label: '42', kind: 'action' },
      { id: '2', label: 'Beta', kind: 'special' },
      { id: 'gamma', label: 'Gamma', kind: 'custom' },
    ]);
  });

  it('applies actions via execute fallback and refreshes cached actions', () => {
    const real = {
      mount: vi.fn(),
      state: { legalActions: ['initial'] },
      execute: vi.fn((actionId: string) => {
        real.state = { legalActions: [`next:${actionId}`] };
      }),
    };
    const engine = fromRealEngine(real);

    engine.mount(createHost(), 'start');
    expect(engine.getLegalActions().map((action) => action.id)).toEqual(['initial']);

    engine.apply('go');
    expect(real.execute).toHaveBeenCalledWith('go');
    expect(engine.getLegalActions().map((action) => action.id)).toEqual(['next:go']);
  });

  it('updates cached actions when state events emit payloads', () => {
    const events = createEvents();
    const real = {
      mount: vi.fn(),
      events,
      state: { legalActions: ['idle'] },
    };
    const engine = fromRealEngine(real);

    engine.mount(createHost(), 'expr');
    const listener = vi.fn();
    const cleanup = engine.on('state', listener);

    const registeredBeforeCleanup = events.get('state');
    expect(registeredBeforeCleanup).toHaveLength(1);

    events.emit('state', { legalActions: ['alpha'] });
    expect(listener).toHaveBeenCalledWith({ legalActions: ['alpha'] });
    expect(engine.getLegalActions().map((action) => action.id)).toEqual(['alpha']);

    cleanup();
    expect(events.off).toHaveBeenCalledWith('state', registeredBeforeCleanup[0]);
    expect(events.get('state')).toHaveLength(0);
  });

  it('subscribes to other events and unsubscribes via off fallback', () => {
    const events = createEvents();
    const real = {
      mount: vi.fn(),
      events,
      state: { legalActions: [] },
    };
    const engine = fromRealEngine(real);

    engine.mount(createHost(), 'expr');
    const handler = vi.fn();
    const cleanup = engine.on('hover', handler);

    expect(events.on).toHaveBeenCalledWith('hover', expect.any(Function));
    events.emit('hover', { token: '1' });
    expect(handler).toHaveBeenCalledWith({ token: '1' });

    const registeredBeforeCleanup = events.get('hover');
    expect(registeredBeforeCleanup).toHaveLength(1);

    cleanup();
    expect(events.off).toHaveBeenCalledWith('hover', registeredBeforeCleanup[0]);
    events.emit('hover', { token: '2' });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('exports snapshots via exportState fallback when export is unavailable', () => {
    const snapshot = { ast: { expression: 'x' }, tex: 'x', html: '<math>x</math>' };
    const real = {
      mount: vi.fn(),
      exportState: vi.fn(() => snapshot),
      state: { legalActions: [] },
    };
    const engine = fromRealEngine(real);

    engine.mount(createHost(), 'expr');
    expect(engine.export()).toEqual(snapshot);
  });
});
