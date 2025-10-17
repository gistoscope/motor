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
    input: opts?.input ?? undefined
  });
  return { code: r.status ?? 0, out: r.stdout, err: r.stderr };
}

describe('stats: invalid --format', () => {
  it('errors on unknown format', () => {
    const sample = '{"nodes":[],"edges":[]}';
    const r = run(['stats', '--format', 'bogus'], { input: sample });
    expect(r.code).toBe(1);
    expect(r.out).toBe('');
    expect(r.err).toMatch(/invalid --format; expected text\|json/);
  });
});
