import { describe, expect, it } from 'vitest';

import {
  DEFAULT_VIEWER_URL_STATE,
  decodeViewerStateFromSearch,
  encodeViewerStateToSearch,
} from '../util/state-url';

describe('state-url helpers', () => {
  it('encodes and decodes viewer state without data loss', () => {
    const original = {
      expression: '{\n  "nodes": []\n}',
      overlays: { scc: true, cycles: false, shortest: true },
      scale: 1.375,
    };

    const encoded = encodeViewerStateToSearch(original);
    const decoded = decodeViewerStateFromSearch(encoded);

    expect(decoded).toEqual({
      expression: original.expression,
      overlays: { scc: true, cycles: false, shortest: true },
      scale: 1.375,
    });
  });

  it('produces a stable parameter order', () => {
    const encoded = encodeViewerStateToSearch({
      expression: 'A',
      overlays: { scc: true, cycles: true, shortest: false },
      scale: 2,
    });

    expect(encoded.split('&')).toEqual(['expr=A', 'ov=scc%2Ccycles', 'sc=2']);
  });

  it('omits default values from the query string', () => {
    const encoded = encodeViewerStateToSearch({
      expression: '',
      overlays: { scc: false, cycles: false, shortest: false },
      scale: DEFAULT_VIEWER_URL_STATE.scale,
    });

    expect(encoded).toBe('');
  });

  it('ignores unknown overlays and invalid scale on decode', () => {
    const decoded = decodeViewerStateFromSearch('expr=test&ov=scc,unknown,shortest&sc=oops');

    expect(decoded).toEqual({
      expression: 'test',
      overlays: { scc: true, cycles: false, shortest: true },
      scale: DEFAULT_VIEWER_URL_STATE.scale,
    });
  });
});
