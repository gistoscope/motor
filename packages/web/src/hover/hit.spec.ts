import { pickTarget } from './hit';
import { describe, it, expect } from 'vitest';
describe('pickTarget', () => {
  it('reads [data-kind][data-id]', () => {
    const div = document.createElement('div');
    div.innerHTML = `<span data-kind="node" data-id="node:42"></span>`;
    const el = div.firstElementChild!;
    const t = pickTarget(el);
    expect(t?.kind).toBe('node');
    expect(t?.id).toBe('node:42');
  });
  it('supports legacy [data-token-id]', () => {
    const div = document.createElement('div');
    div.innerHTML = `<span data-token-id="token:7"></span>`;
    const el = div.firstElementChild!;
    const t = pickTarget(el);
    expect(t?.kind).toBe('token');
    expect(t?.id).toBe('token:7');
  });
});
