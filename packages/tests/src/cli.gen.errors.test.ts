import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

function bin() {
  const url = new URL('../../cli/bin/motor.js', import.meta.url);
  return fileURLToPath(url);
}
function run(args: string[]) {
  const r = spawnSync(process.execPath, [bin(), ...args], {
    encoding: 'utf-8',
    maxBuffer: 1024 * 1024
  });
  return { code: r.status ?? 0, out: r.stdout, err: r.stderr };
}

describe('gen: flag validation errors', () => {
  it('invalid --kind', () => {
    const r = run(['gen', '--kind', 'unknown', '--n', '3', '--format', 'json']);
    expect(r.code).toBe(1);
    expect(r.out).toBe('');
    expect(r.err).toMatch(/invalid --kind/);
  });

  it('missing --kind', () => {
    const r = run(['gen', '--n', '3', '--format', 'json']);
    expect(r.code).toBe(1);
    expect(r.out).toBe('');
    expect(r.err).toMatch(/--kind/);
  });

  it('tree missing parameters', () => {
    const r = run(['gen', '--kind', 'tree', '--format', 'json']);
    expect(r.code).toBe(1);
    expect(r.out).toBe('');
    expect(r.err).toMatch(/tree kind requires --branching and --levels/);
  });

  it('invalid --n (non-integer)', () => {
    const r = run(['gen', '--kind', 'chain', '--n', 'x', '--format', 'json']);
    expect(r.code).toBe(1);
    expect(r.out).toBe('');
    expect(r.err).toMatch(/must be a positive integer/);
  });

  it('invalid --n (<=0)', () => {
    const r = run(['gen', '--kind', 'chain', '--n', '0', '--format', 'json']);
    expect(r.code).toBe(1);
    expect(r.out).toBe('');
    expect(r.err).toMatch(/must be a positive integer/);
  });

  it('invalid --format', () => {
    const r = run(['gen', '--kind', 'chain', '--n', '3', '--format', 'yaml']);
    expect(r.code).toBe(1);
    expect(r.out).toBe('');
    expect(r.err).toMatch(/must be json\|dot\|inspect|expected json\|dot\|inspect/);
  });
});
