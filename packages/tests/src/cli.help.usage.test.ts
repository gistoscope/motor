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

describe('top-level help documents help/version subcommands', () => {
  it('--help contains help/version lines; stderr empty; trailing \\n', () => {
    const r = run(['--help']);
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out).toContain('motor help [<cmd>]');
    expect(r.out).toContain('motor version');
    expect(r.out.endsWith('\n')).toBe(true);
  });

  it('help prints the same Usage section', () => {
    const r = run(['help']);
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out).toContain('Usage:');
    expect(r.out).toContain('motor help [<cmd>]');
    expect(r.out).toContain('motor version');
  });
});
