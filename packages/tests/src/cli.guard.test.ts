import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

function motorPath() {
  const url = new URL('../../cli/bin/motor.js', import.meta.url);
  return fileURLToPath(url);
}

describe('motor.js guards', () => {
  it('no console.log in help/version functions; markers present', () => {
    const text = readFileSync(motorPath(), 'utf-8');
    expect(text.includes('console.log(')).toBe(false);
    expect(text.includes('// <<HELP:BEGIN>>')).toBe(true);
    expect(text.includes('// <<HELP:END>>')).toBe(true);
    expect(text.includes('// <<MAIN:BEGIN>>')).toBe(true);
    expect(text.includes('// <<MAIN:END>>')).toBe(true);
  });
});
