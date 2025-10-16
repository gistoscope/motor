import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

function bin() {
  const url = new URL('../../cli/bin/motor.js', import.meta.url);
  return fileURLToPath(url);
}
function run(args: string[]) {
  const r = spawnSync(process.execPath, [bin(), ...args], { encoding: 'utf-8', maxBuffer: 1024 * 1024 });
  return { code: r.status ?? 0, out: r.stdout, err: r.stderr };
}

describe('motor unknown command', () => {
  it('exits 1, prints error to stderr, does not print help to stdout', () => {
    const r = run(['__definitely_unknown__']);
    expect(r.code).toBe(1);
    expect(r.out).toBe('');
    expect(r.err).toMatch(/Unknown command:/);
  });
});
