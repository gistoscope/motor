import { describe, expect, it } from 'vitest';

import { StubRealMathEngine } from '../../web/src/bridge/stub';
import type { MathEngineEventCallback, RealMathEngineLike } from '../../web/src/bridge/types';

describe('web bridge conformance', () => {
  it('aligns StubRealMathEngine with RealMathEngineLike', async () => {
    const stub = new StubRealMathEngine();
    const real: RealMathEngineLike = stub;

    const seen: Array<{ event: string; payload: unknown }> = [];
    const listener: MathEngineEventCallback = (payload) => {
      seen.push({ event: 'parse', payload });
    };

    const disposer = real.on?.('parse', listener);
    const parseResult = await Promise.resolve(real.parse('2+2'));

    expect(parseResult).toEqual({ type: 'parse', input: '2+2' });
    expect(real.exportState?.()).toEqual(parseResult);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toEqual({ event: 'parse', payload: { type: 'parse', input: '2+2' } });

    seen.length = 0;
    const executeResult = await Promise.resolve(real.execute('simplify'));
    expect(executeResult).toEqual({ type: 'execute', actionId: 'simplify' });

    stub.emit('parse', { ok: true });
    expect(seen).toHaveLength(1);
    expect(seen[0]).toEqual({ event: 'parse', payload: { ok: true } });

    if (typeof disposer === 'function') {
      disposer();
    }

    stub.emit('parse', { ok: false });
    expect(seen).toHaveLength(1);

    stub.clearListeners();
    stub.emit('parse', { ok: 'ignored' });
    expect(seen).toHaveLength(1);
  });
});
