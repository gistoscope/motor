import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

function bin() {
  const url = new URL('../../cli/bin/motor.js', import.meta.url);
  return fileURLToPath(url);
}

function run(args: string[]) {
  const result = spawnSync(process.execPath, [bin(), ...args], {
    encoding: 'utf-8',
    maxBuffer: 1024 * 1024
  });
  return { code: result.status ?? 0, out: result.stdout, err: result.stderr };
}

describe('motor --version single-line', () => {
  it('prints version once to stdout with trailing newline; stderr empty', () => {
    const r = run(['--version']);
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out).toMatch(/^\d+\.\d+(?:\.\d+)?\n$/);
  });
});
