import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

function bin() {
  const url = new URL('../../cli/bin/motor.js', import.meta.url);
  return fileURLToPath(url);
}

function run(args: string[], opts?: { input?: string }) {
  const result = spawnSync(process.execPath, [bin(), ...args], {
    encoding: 'utf-8',
    maxBuffer: 1024 * 1024,
    input: opts?.input ?? undefined
  });
  return { code: result.status ?? 0, out: result.stdout, err: result.stderr };
}

describe('pipeline: gen(json) -> validate', () => {
  it('validate reads JSON from stdin and prints OK', () => {
    const g = run(['gen', '--kind', 'chain', '--n', '3', '--format', 'json']);
    expect(g.code).toBe(0);
    expect(g.out.length).toBeGreaterThan(0);

    const v = run(['validate'], { input: g.out });
    expect(v.code).toBe(0);
    expect(v.err).toBe('');
    expect(v.out).toBe('OK\n');
  });
});
