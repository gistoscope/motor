import { describe, expect, it, vi } from 'vitest';

import { createEventHub, type EventHub } from '../events';

interface TestEvents {
  'alpha': number;
  'beta': string;
  'void': null;
}

const createHub = (): EventHub<TestEvents> => createEventHub<TestEvents>();

describe('createEventHub', () => {
  it('emits events to registered listeners', () => {
    const hub = createHub();
    const alpha = vi.fn();
    const beta = vi.fn();

    hub.on('alpha', alpha);
    hub.on('beta', beta);

    hub.emit('alpha', 42);
    hub.emit('beta', 'hello');

    expect(alpha).toHaveBeenCalledTimes(1);
    expect(alpha).toHaveBeenCalledWith(42);
    expect(beta).toHaveBeenCalledTimes(1);
    expect(beta).toHaveBeenCalledWith('hello');
  });

  it('supports removing listeners via the unsubscribe handle', () => {
    const hub = createHub();
    const alpha = vi.fn();

    const off = hub.on('alpha', alpha);
    off();

    hub.emit('alpha', 1);

    expect(alpha).not.toHaveBeenCalled();
  });

  it('removes listeners via off()', () => {
    const hub = createHub();
    const alpha = vi.fn();

    hub.on('alpha', alpha);
    hub.off('alpha', alpha);

    hub.emit('alpha', 2);

    expect(alpha).not.toHaveBeenCalled();
  });

  it('only runs once listeners a single time', () => {
    const hub = createHub();
    const listener = vi.fn();

    hub.once('beta', listener);

    hub.emit('beta', 'first');
    hub.emit('beta', 'second');

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith('first');
  });

  it('clears all listeners', () => {
    const hub = createHub();
    const alpha = vi.fn();
    const beta = vi.fn();

    hub.on('alpha', alpha);
    hub.on('beta', beta);
    hub.clear();

    hub.emit('alpha', 5);
    hub.emit('beta', 'ignored');

    expect(alpha).not.toHaveBeenCalled();
    expect(beta).not.toHaveBeenCalled();
  });

  it('handles void payloads', () => {
    const hub = createHub();
    const listener = vi.fn();

    hub.on('void', listener);
    hub.emit('void', null);

    expect(listener).toHaveBeenCalledWith(null);
  });
});
