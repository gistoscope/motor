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

describe('motor help subcommand', () => {
  it('motor help -> top-level help on stdout', () => {
    const r = run(['help']);
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out).toContain('motor — GRASP CLI');
    expect(r.out.endsWith('\n')).toBe(true);
  });

  it('motor help json -> per-command help on stdout', () => {
    const r = run(['help', 'json']);
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out).toMatch(/^motor json \[--in FILE]/);
    expect(r.out.endsWith('\n')).toBe(true);
  });
});
