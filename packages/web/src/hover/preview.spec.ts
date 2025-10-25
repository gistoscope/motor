import { previewWithTimeout } from './preview';
import type { Target } from './ids';
import { describe, it, expect } from 'vitest';
describe('previewWithTimeout', () => {
  const target: Target = { kind:'node', id:'node:1' };
  it('returns ok:true with actions', async () => {
    const getLegal = () => [{ id:'a1', label:'Action 1' }];
    const res = await previewWithTimeout(getLegal, target, 50);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.actions.length).toBe(1);
  });
  it('times out when slow', async () => {
    const getLegal = () => { const start = Date.now(); while(Date.now()-start<200){}; return []; };
    const res = await previewWithTimeout(getLegal, target, 50);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe('timeout');
  });
});
