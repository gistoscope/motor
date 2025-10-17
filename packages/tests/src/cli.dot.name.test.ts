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

describe('DOT graph name (default & --name)', () => {
  it('dot (default name) uses "G" and ends with \n', () => {
    // Получаем исходный GraphJSON
    const g = run(['gen', '--kind', 'chain', '--n', '3', '--format', 'json']);
    expect(g.code).toBe(0);
    expect(g.err).toBe('');
    expect(g.out.length).toBeGreaterThan(0);

    // Подаём в dot без --name (должно быть имя G)
    const r = run(['dot'], { input: g.out });
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out.length).toBeGreaterThan(0);
    expect(r.out.endsWith('\n')).toBe(true);

    // Толерантно к digraph/graph
    expect(/^\s*(digraph|graph)\s+G\b/i.test(r.out)).toBe(true);
  });

  it('dot --name CustomName overrides default and ends with \n', () => {
    const g = run(['gen', '--kind', 'chain', '--n', '3', '--format', 'json']);
    expect(g.code).toBe(0);

    const r = run(['dot', '--name', 'CustomName'], { input: g.out });
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out.length).toBeGreaterThan(0);
    expect(r.out.endsWith('\n')).toBe(true);

    expect(/^\s*(digraph|graph)\s+CustomName\b/i.test(r.out)).toBe(true);
  });

  it('gen --format dot --name X emits DOT with that name and trailing \n', () => {
    const r = run(['gen', '--kind', 'chain', '--n', '3', '--format', 'dot', '--name', 'MyGraph']);
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out.length).toBeGreaterThan(0);
    expect(r.out.endsWith('\n')).toBe(true);

    expect(/^\s*(digraph|graph)\s+MyGraph\b/i.test(r.out)).toBe(true);
  });
});
