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

describe('readGraphJSON: invalid stdin/file handling', () => {
  it('inspect with garbage stdin -> exit 1, stderr non-empty, stdout empty', () => {
    const r = run(['inspect'], { input: '<<garbage>>' });
    expect(r.code).toBe(1);
    expect(r.out).toBe('');
    expect(r.err.length).toBeGreaterThan(0);
  });

  it('json with garbage stdin -> exit 1, stderr non-empty, stdout empty', () => {
    const r = run(['json'], { input: '<<garbage>>' });
    expect(r.code).toBe(1);
    expect(r.out).toBe('');
    expect(r.err.length).toBeGreaterThan(0);
  });

  it('dot with garbage stdin -> exit 1, stderr non-empty, stdout empty', () => {
    const r = run(['dot'], { input: '<<garbage>>' });
    expect(r.code).toBe(1);
    expect(r.out).toBe('');
    expect(r.err.length).toBeGreaterThan(0);
  });

  it('stats with garbage stdin -> exit 1, stderr non-empty, stdout empty', () => {
    const r = run(['stats'], { input: '<<garbage>>' });
    expect(r.code).toBe(1);
    expect(r.out).toBe('');
    expect(r.err.length).toBeGreaterThan(0);
  });
});
