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

describe('CLI determinism & idempotency', () => {
  it('json normalization is deterministic and ends with \\n', () => {
    const g = run(['gen', '--kind', 'chain', '--n', '5', '--format', 'json']);
    expect(g.code).toBe(0);
    expect(g.err).toBe('');
    expect(g.out.length).toBeGreaterThan(0);

    const r1 = run(['json'], { input: g.out });
    const r2 = run(['json'], { input: g.out });

    expect(r1.code).toBe(0);
    expect(r2.code).toBe(0);
    expect(r1.err).toBe('');
    expect(r2.err).toBe('');

    // байтовое совпадение и трейлинг \n
    expect(r1.out).toBe(r2.out);
    expect(r1.out.endsWith('\n')).toBe(true);

    // валидный JSON
    expect(() => JSON.parse(r1.out)).not.toThrow();
  });

  it('inspect output is deterministic and ends with \\n', () => {
    const g = run(['gen', '--kind', 'chain', '--n', '5', '--format', 'json']);
    const r1 = run(['inspect'], { input: g.out });
    const r2 = run(['inspect'], { input: g.out });

    expect(r1.code).toBe(0);
    expect(r2.code).toBe(0);
    expect(r1.err).toBe('');
    expect(r2.err).toBe('');

    expect(r1.out.length).toBeGreaterThan(0);
    expect(r1.out).toBe(r2.out);
    expect(r1.out.endsWith('\n')).toBe(true);
  });

  it('dot output is deterministic; default name equals --name G; ends with \\n', () => {
    const g = run(['gen', '--kind', 'chain', '--n', '5', '--format', 'json']);

    const rDefault1 = run(['dot'], { input: g.out });
    const rDefault2 = run(['dot'], { input: g.out });
    const rNamedG = run(['dot', '--name', 'G'], { input: g.out });

    for (const r of [rDefault1, rDefault2, rNamedG]) {
      expect(r.code).toBe(0);
      expect(r.err).toBe('');
      expect(r.out.length).toBeGreaterThan(0);
      expect(r.out.endsWith('\n')).toBe(true);
    }

    // детерминизм и эквивалентность default vs --name G
    expect(rDefault1.out).toBe(rDefault2.out);
    expect(rDefault1.out).toBe(rNamedG.out);
  });
});
