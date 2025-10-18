import { describe, it, expect } from 'vitest';
import { isOperatorChar } from '../opTokens';

describe('isOperatorChar', () => {
  it('recognizes × and ÷ as operators', () => {
    expect(isOperatorChar('×')).toBe(true);
    expect(isOperatorChar('÷')).toBe(true);
    expect(isOperatorChar('*')).toBe(true);
    expect(isOperatorChar('/')).toBe(true);
  });
});
