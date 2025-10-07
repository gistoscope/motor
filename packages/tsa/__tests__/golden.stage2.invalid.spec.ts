import { describe, it, expect } from 'vitest';
import { parseStage2Expression } from '../src';

describe('TSA Golden Set 03 — invalid Stage2 forms', () => {
  it('rejects leading operators (+,*,/)', () => {
    expect(() => parseStage2Expression('+2')).toThrow();
    expect(() => parseStage2Expression('*3')).toThrow();
    expect(() => parseStage2Expression('/4')).toThrow();
  });

  it('rejects trailing operators', () => {
    expect(() => parseStage2Expression('2+')).toThrow();
    expect(() => parseStage2Expression('3-')).toThrow();
    expect(() => parseStage2Expression('4*')).toThrow();
    expect(() => parseStage2Expression('5/')).toThrow();
  });

  it('rejects bad parentheses', () => {
    expect(() => parseStage2Expression('()')).toThrow();
    expect(() => parseStage2Expression('(2+3')).toThrow();
    expect(() => parseStage2Expression('2+3)')).toThrow();
  });

  it('rejects malformed decimals', () => {
    expect(() => parseStage2Expression('2..5')).toThrow();
    expect(() => parseStage2Expression('5.')).toThrow();
  });
});
