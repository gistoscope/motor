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
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

describe('Unicode graph name in DOT', () => {
  const NAME = 'ИмяГрафа-試験-ßETA';

  it('dot --name <UNICODE> via stdin pipeline', () => {
    const g = run(['gen', '--kind', 'chain', '--n', '3', '--format', 'json']);
    expect(g.code).toBe(0);
    expect(g.err).toBe('');
    expect(g.out.length).toBeGreaterThan(0);

    const r = run(['dot', '--name', NAME], { input: g.out });
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out.length).toBeGreaterThan(0);
    expect(r.out.endsWith('\n')).toBe(true);

    // Толерантная проверка: digraph|graph, затем где-то до { встречается имя (с кавычками или без)
    const rx = new RegExp('^\\s*(?:digraph|graph)[^{]*' + reEscape(NAME), 'im');
    expect(rx.test(r.out)).toBe(true);
  });

  it('gen --format dot --name <UNICODE>', () => {
    const r = run(['gen', '--kind', 'chain', '--n', '3', '--format', 'dot', '--name', NAME]);
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out.length).toBeGreaterThan(0);
    expect(r.out.endsWith('\n')).toBe(true);

    const rx = new RegExp('^\\s*(?:digraph|graph)[^{]*' + reEscape(NAME), 'im');
    expect(rx.test(r.out)).toBe(true);
  });
});
