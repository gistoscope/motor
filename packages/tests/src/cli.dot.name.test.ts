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

describe('DOT graph name & determinism', () => {
  it('dot (stdin) uses default name "G" and respects --name', () => {
    // Подготовим GraphJSON
    const g = run(['gen', '--kind', 'chain', '--n', '3', '--format', 'json']);
    expect(g.code).toBe(0);
    expect(g.err).toBe('');
    expect(g.out.length).toBeGreaterThan(0);

    // По умолчанию должен быть G
    const d1 = run(['dot'], { input: g.out });
    expect(d1.code).toBe(0);
    expect(d1.err).toBe('');
    expect(d1.out.length).toBeGreaterThan(0);
    expect(d1.out.endsWith('\n')).toBe(true);
    expect(d1.out).toMatch(/^\s*(digraph|graph)\s+G\s*\{/i);

    // С кастомным именем, например T
    const d2 = run(['dot', '--name', 'T'], { input: g.out });
    expect(d2.code).toBe(0);
    expect(d2.err).toBe('');
    expect(d2.out.length).toBeGreaterThan(0);
    expect(d2.out.endsWith('\n')).toBe(true);
    expect(d2.out).toMatch(/\b(digraph|graph)\s+T\b/i);
  });

  it('gen --format dot uses default "G" and respects --name', () => {
    const a = run(['gen', '--kind', 'chain', '--n', '3', '--format', 'dot']);
    expect(a.code).toBe(0);
    expect(a.err).toBe('');
    expect(a.out.length).toBeGreaterThan(0);
    expect(a.out.endsWith('\n')).toBe(true);
    expect(a.out).toMatch(/^\s*(digraph|graph)\s+G\s*\{/i);

    const b = run(['gen', '--kind', 'chain', '--n', '3', '--format', 'dot', '--name', 'K']);
    expect(b.code).toBe(0);
    expect(b.err).toBe('');
    expect(b.out.length).toBeGreaterThan(0);
    expect(b.out.endsWith('\n')).toBe(true);
    expect(b.out).toMatch(/\b(digraph|graph)\s+K\b/i);
  });

  it('determinism: dot(stdin) output is byte-for-byte identical across runs', () => {
    const g = run(['gen', '--kind', 'chain', '--n', '4', '--format', 'json']);
    expect(g.code).toBe(0);

    const r1 = run(['dot', '--name', 'G1'], { input: g.out });
    const r2 = run(['dot', '--name', 'G1'], { input: g.out });

    expect(r1.code).toBe(0);
    expect(r2.code).toBe(0);
    expect(r1.err).toBe('');
    expect(r2.err).toBe('');
    expect(r1.out.endsWith('\n')).toBe(true);
    expect(r2.out.endsWith('\n')).toBe(true);
    expect(r2.out).toBe(r1.out);
  });

  it('determinism: gen --format dot output is identical across runs', () => {
    const r1 = run(['gen', '--kind', 'cycle', '--n', '5', '--format', 'dot', '--name', 'Z']);
    const r2 = run(['gen', '--kind', 'cycle', '--n', '5', '--format', 'dot', '--name', 'Z']);

    expect(r1.code).toBe(0);
    expect(r2.code).toBe(0);
    expect(r1.err).toBe('');
    expect(r2.err).toBe('');
    expect(r1.out.endsWith('\n')).toBe(true);
    expect(r2.out.endsWith('\n')).toBe(true);
    expect(r2.out).toBe(r1.out);
  });
});
