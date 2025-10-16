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

describe('motor help', () => {
  it('top-level --help prints usage, commands, examples (exit 0)', () => {
    const r = run(['--help']);
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out).toMatch(/Usage:/);
    expect(r.out).toMatch(/Commands:/);
    expect(r.out).toMatch(/Examples:/);
    expect(r.out.endsWith('\n')).toBe(true);
  });

  it('per-command help: inspect', () => {
    const r = run(['inspect', '--help']);
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out).toMatch(/^motor inspect \[--in FILE] \[--out FILE]/m);
  });

  it('per-command help: dot', () => {
    const r = run(['dot', '--help']);
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out).toMatch(/^motor dot \[--in FILE] \[--name NAME] \[--out FILE]/m);
  });

  it('per-command help: json', () => {
    const r = run(['json', '--help']);
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out).toMatch(/^motor json \[--in FILE] \[--out FILE]/m);
  });

  it('per-command help: validate', () => {
    const r = run(['validate', '--help']);
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out).toMatch(/^motor validate \[--in FILE]/m);
  });

  it('per-command help: gen', () => {
    const r = run(['gen', '--help']);
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out).toMatch(/--kind .*chain\|cycle\|star/);
    expect(r.out).toMatch(/--format .*json\|dot\|inspect/);
  });

  it('per-command help: stats', () => {
    const r = run(['stats', '--help']);
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out).toMatch(/^motor stats \[--in FILE] \[--format text\|json] \[--out FILE]/m);
  });
});
