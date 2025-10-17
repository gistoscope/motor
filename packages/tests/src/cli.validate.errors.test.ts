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

describe('validate: error paths', () => {
  it('invalid JSON via stdin', () => {
    const r = run(['validate'], { input: '{not-json' });
    expect(r.code).toBe(1);
    expect(r.out).toBe('');
    expect(r.err).toMatch(/invalid JSON:/);
  });

  it('invalid GraphJSON structure', () => {
    // valid JSON, but invalid GraphJSON shape
    const bad = '{"foo":"bar"}\n';
    const r = run(['validate'], { input: bad });
    expect(r.code).toBe(1);
    expect(r.out).toBe('');
    // implementation prints "- <error>" lines
    expect(r.err).toMatch(/^- /m);
  });
});
