import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

function binPath() {
  // packages/tests/src -> ../../cli/bin/motor.js
  const url = new URL('../../cli/bin/motor.js', import.meta.url);
  return fileURLToPath(url);
}

function run(args: string[]) {
  const res = spawnSync('node', [binPath(), ...args], {
    encoding: 'utf8'
  });
  return { code: res.status ?? -1, out: (res.stdout ?? '').trim(), err: (res.stderr ?? '').trim() };
}

describe('motor CLI basic', () => {
  it('--help prints usage', () => {
    const { code, out } = run(['--help']);
    expect(code).toBe(0);
    expect(out).toContain('motor — GRASP CLI');
    expect(out).toContain('Usage:');
  });

  it('--version prints semver-ish', () => {
    const { code, out } = run(['--version']);
    expect(code).toBe(0);
    // 0.1.0, 0.1.0-alpha.1, etc.
    expect(out).toMatch(/^\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?$/);
  });

  it('default shows help', () => {
    const { code, out } = run([]);
    expect(code).toBe(0);
    expect(out).toContain('Usage:');
  });
});
