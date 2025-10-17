import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

function bin() {
  const url = new URL('../../cli/bin/motor.js', import.meta.url);
  return fileURLToPath(url);
}

function run(args: string[], opts?: { input?: string }) {
  const r = spawnSync(process.execPath, [bin(), ...args], {
    encoding: 'utf-8',
    maxBuffer: 1024 * 1024,
    input: opts?.input ?? undefined,
  });
  return { code: r.status ?? 0, out: r.stdout, err: r.stderr };
}

describe('stdin pipelines into CLI commands', () => {
  it('gen(json) -> inspect (stdin) emits human-readable output with trailing \\n', () => {
    const g = run(['gen', '--kind', 'chain', '--n', '3', '--format', 'json']);
    expect(g.code).toBe(0);
    expect(g.err).toBe('');
    expect(g.out.length).toBeGreaterThan(0);

    const r = run(['inspect'], { input: g.out });
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out.length).toBeGreaterThan(0);
    expect(r.out.endsWith('\\n')).toBe(true);
  });

  it('gen(json) -> dot (stdin) emits DOT with markers and trailing \\n', () => {
    const g = run(['gen', '--kind', 'chain', '--n', '3', '--format', 'json']);
    expect(g.code).toBe(0);
    const r = run(['dot'], { input: g.out });
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out.length).toBeGreaterThan(0);
    expect(r.out.endsWith('\\n')).toBe(true);
    expect(r.out).toMatch(/digraph|graph/i);
    expect(r.out).toMatch(/[{].*[}]/s);
  });

  it('gen(json) -> json (stdin) normalizes to valid JSON with trailing \\n', () => {
    const g = run(['gen', '--kind', 'chain', '--n', '3', '--format', 'json']);
    expect(g.code).toBe(0);
    const r = run(['json'], { input: g.out });
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out.length).toBeGreaterThan(0);
    expect(r.out.endsWith('\\n')).toBe(true);
    expect(() => JSON.parse(r.out)).not.toThrow();
  });

  it('gen(json) -> stats (text via stdin) prints key lines with trailing \\n', () => {
    const g = run(['gen', '--kind', 'chain', '--n', '3', '--format', 'json']);
    expect(g.code).toBe(0);
    const r = run(['stats'], { input: g.out }); // default is text
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out.length).toBeGreaterThan(0);
    expect(r.out.endsWith('\\n')).toBe(true);
    expect(r.out).toMatch(/nodes:/);
    expect(r.out).toMatch(/edges:/);
  });

  it('gen(json) -> stats --format json (stdin) emits valid JSON with trailing \\n', () => {
    const g = run(['gen', '--kind', 'chain', '--n', '3', '--format', 'json']);
    expect(g.code).toBe(0);
    const r = run(['stats', '--format', 'json'], { input: g.out });
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out.length).toBeGreaterThan(0);
    expect(r.out.endsWith('\\n')).toBe(true);
    const j = JSON.parse(r.out);
    expect(typeof j).toBe('object');
    expect(j).toHaveProperty('nodes');
    expect(j).toHaveProperty('edges');
    expect(j).toHaveProperty('sccCount');
  });
});
