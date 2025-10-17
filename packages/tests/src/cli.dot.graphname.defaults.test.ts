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
function reEscape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\$&');
}
function expectDotWithName(dot: string, name: string) {
  // digraph|graph, затем до { встречаем имя; допускаем кавычки
  const rx = new RegExp(
    `^\\s*(?:digraph|graph)[^{]*"?${reEscape(name)}"?`,
    'im',
  );
  expect(rx.test(dot)).toBe(true);
}

describe('DOT graph name defaults and -n alias', () => {
  it('dot (stdin) with NO --name uses default "G"', () => {
    const g = run(['gen', '--kind', 'chain', '--n', '3', '--format', 'json']);
    expect(g.code).toBe(0);
    const r = run(['dot'], { input: g.out });
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out.length).toBeGreaterThan(0);
    expect(r.out.endsWith('\n')).toBe(true);
    expectDotWithName(r.out, 'G');
  });

  it('gen --format dot with NO --name uses default "G"', () => {
    const r = run(['gen', '--kind', 'chain', '--n', '3', '--format', 'dot']);
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out.length).toBeGreaterThan(0);
    expect(r.out.endsWith('\n')).toBe(true);
    expectDotWithName(r.out, 'G');
  });

  it('dot -n <NAME> sets graph name', () => {
    const NAME = 'Name-Alias-n';
    const g = run(['gen', '--kind', 'chain', '--n', '3', '--format', 'json']);
    const r = run(['dot', '-n', NAME], { input: g.out });
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out.endsWith('\n')).toBe(true);
    expectDotWithName(r.out, NAME);
  });

  it('gen --format dot -n <NAME> sets graph name', () => {
    const NAME = 'Name-Alias-Gen';
    const r = run(['gen', '--kind', 'chain', '--n', '3', '--format', 'dot', '-n', NAME]);
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out.endsWith('\n')).toBe(true);
    expectDotWithName(r.out, NAME);
  });
});
