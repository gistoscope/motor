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

describe('motor help <unknown>', () => {
  it('prints "Unknown command for help:" to stdout, exit 0, stderr empty', () => {
    const r = run(['help', '__definitely_unknown__']);
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out).toMatch(/Unknown command for help:\s+__definitely_unknown__/);
    expect(r.out.endsWith('\n')).toBe(true);
  });
});
