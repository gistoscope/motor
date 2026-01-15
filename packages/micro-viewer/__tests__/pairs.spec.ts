import { describe, expect, it } from 'vitest';
import { buildPairs } from '../pairs.js';

type Descriptor = Parameters<typeof buildPairs>[0][number];

function token(
  id: string,
  side: Descriptor['side'],
  text: string,
  overrides: Partial<Omit<Descriptor, 'id' | 'side' | 'text'>> = {},
): Descriptor {
  return {
    id,
    side,
    text,
    sizeClass: null,
    symmetric: false,
    isNull: false,
    family: null,
    ...overrides,
  };
}

describe('buildPairs', () => {
  it('matches simple parentheses', () => {
    const result = buildPairs([
      token('open', 'open', '('),
      token('close', 'close', ')'),
    ]);

    expect(result.pairs).toEqual([
      { openId: 'open', closeId: 'close', key: '()' },
    ]);
    expect(result.openOrphans).toEqual([]);
    expect(result.closeOrphans).toEqual([]);
  });

  it('handles nested delimiters', () => {
    const result = buildPairs([
      token('open-paren', 'open', '('),
      token('open-bracket', 'open', '['),
      token('close-bracket', 'close', ']'),
      token('close-paren', 'close', ')'),
    ]);

    expect(result.pairs).toEqual([
      { openId: 'open-bracket', closeId: 'close-bracket', key: '[]' },
      { openId: 'open-paren', closeId: 'close-paren', key: '()' },
    ]);
    expect(result.openOrphans).toEqual([]);
    expect(result.closeOrphans).toEqual([]);
  });

  it('tracks multiple sibling pairs', () => {
    const result = buildPairs([
      token('open-a', 'open', '('),
      token('close-a', 'close', ')'),
      token('open-b', 'open', '['),
      token('close-b', 'close', ']'),
    ]);

    expect(result.pairs).toEqual([
      { openId: 'open-a', closeId: 'close-a', key: '()' },
      { openId: 'open-b', closeId: 'close-b', key: '[]' },
    ]);
    expect(result.openOrphans).toEqual([]);
    expect(result.closeOrphans).toEqual([]);
  });

  it('pairs flexible \left...\right delimiters', () => {
    const result = buildPairs([
      token('flex-open', 'open', '', { isNull: true }),
      token('flex-close', 'close', ')'),
    ]);

    expect(result.pairs).toEqual([
      { openId: 'flex-open', closeId: 'flex-close', key: '()' },
    ]);
    expect(result.openOrphans).toEqual([]);
    expect(result.closeOrphans).toEqual([]);
  });

  it('flags orphan opening delimiters', () => {
    const result = buildPairs([
      token('orphan-open', 'open', '('),
    ]);

    expect(result.pairs).toEqual([]);
    expect(result.openOrphans).toEqual(['orphan-open']);
    expect(result.closeOrphans).toEqual([]);
  });

  it('flags orphan closing delimiters', () => {
    const result = buildPairs([
      token('orphan-close', 'close', ')'),
    ]);

    expect(result.pairs).toEqual([]);
    expect(result.openOrphans).toEqual([]);
    expect(result.closeOrphans).toEqual(['orphan-close']);
  });

  it('supports empty () spans', () => {
    const result = buildPairs([
      token('empty-open', 'open', '('),
      token('empty-close', 'close', ')'),
    ]);

    expect(result.pairs).toEqual([
      { openId: 'empty-open', closeId: 'empty-close', key: '()' },
    ]);
    expect(result.openOrphans).toEqual([]);
    expect(result.closeOrphans).toEqual([]);
  });

  it('ignores delim sizing differences', () => {
    const result = buildPairs([
      token('size-open', 'open', '(', { sizeClass: 'delim-size3' }),
      token('size-close', 'close', ')', { sizeClass: 'delim-size4' }),
    ]);

    expect(result.pairs).toEqual([
      { openId: 'size-open', closeId: 'size-close', key: '()' },
    ]);
    expect(result.openOrphans).toEqual([]);
    expect(result.closeOrphans).toEqual([]);
  });
});
