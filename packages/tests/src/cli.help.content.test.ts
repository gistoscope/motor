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
    maxBuffer: 1024 * 1024,
  });
  return { code: r.status ?? 0, out: r.stdout, err: r.stderr };
}

describe('motor help content lock', () => {
  it('top-level --help contains key sections and ends with \\n', () => {
    const r = run(['--help']);
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out.length).toBeGreaterThan(0);

    // Key sections
    expect(r.out).toContain('motor — GRASP CLI');
    expect(r.out).toContain('Usage:');
    expect(r.out).toContain('Commands:');
    expect(r.out).toContain('Common flags:');
    expect(r.out).toContain('Examples:');

    // Commands listed
    for (const cmd of ['inspect', 'dot', 'json', 'validate', 'stats', 'gen']) {
      expect(r.out).toContain(cmd);
    }

    expect(r.out.endsWith('\n')).toBe(true);
  });

  it('top-level "help" subcommand mirrors --help output contract', () => {
    const r = run(['help']);
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out).toContain('Usage:');
    expect(r.out).toContain('Commands:');
    expect(r.out).toContain('Common flags:');
    expect(r.out).toContain('Examples:');
    expect(r.out.endsWith('\n')).toBe(true);
  });

  it('per-command help: json', () => {
    const r = run(['help', 'json']);
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out).toMatch(/^motor json \[--in FILE]/);
    expect(r.out.endsWith('\n')).toBe(true);
  });

  it('per-command help: dot', () => {
    const r = run(['help', 'dot']);
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out).toMatch(/^motor dot \[--in FILE]/);
    expect(r.out.endsWith('\n')).toBe(true);
  });
});
