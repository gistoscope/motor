import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

function bin() {
  const url = new URL('../../cli/bin/motor.js', import.meta.url);
  return fileURLToPath(url);
}
function run(args: string[]) {
  const r = spawnSync(process.execPath, [bin(), ...args], {
    encoding: 'utf-8', maxBuffer: 1024 * 1024
  });
  return { code: r.status ?? 0, out: r.stdout, err: r.stderr };
}

describe('error style (stderr, single line, trailing \n)', () => {
  it('gen: invalid --format', () => {
    const r = run(['gen', '--kind', 'chain', '--n', '3', '--format', '__bad__']);
    expect(r.code).toBe(1);
    expect(r.out).toBe('');
    expect(r.err).toMatch(/--format/);
    expect(r.err.endsWith('\n')).toBe(true);
  });

  it('gen: invalid --n', () => {
    const r = run(['gen', '--kind', 'chain', '--n', '0']);
    expect(r.code).toBe(1);
    expect(r.out).toBe('');
    expect(r.err).toMatch(/--n/);
    expect(r.err.endsWith('\n')).toBe(true);
  });
});
