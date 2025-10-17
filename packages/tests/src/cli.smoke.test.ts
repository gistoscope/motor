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

const CMDS = ['inspect', 'dot', 'json', 'validate', 'stats', 'gen'] as const;

describe('motor CLI smoke', () => {
  it('top-level --help prints to stdout and exits 0', () => {
    const r = run(['--help']);
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out).toContain('motor — GRASP CLI');
    expect(r.out.endsWith('\n')).toBe(true);
  });

  it('per-command --help takes precedence over top-level', () => {
    for (const cmd of CMDS) {
      const r = run([cmd, '--help']);
      expect(r.code).toBe(0);
      expect(r.err).toBe('');
      expect(r.out.length).toBeGreaterThan(0);
      expect(r.out.endsWith('\n')).toBe(true);
    }
  });

  it('unknown command -> stderr only and exit 1', () => {
    const r = run(['__definitely_unknown__']);
    expect(r.code).toBe(1);
    expect(r.out).toBe('');
    expect(r.err).toMatch(/Unknown command:/);
  });
});
