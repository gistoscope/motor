import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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

describe('motor --out routing (extended)', () => {
  it('prepare: produce source GraphJSON via gen', () => {
    const g = run(['gen', '--kind', 'chain', '--n', '3', '--format', 'json']);
    expect(g.code).toBe(0);
    expect(g.err).toBe('');
    expect(g.out.length).toBeGreaterThan(0);
    expect(() => JSON.parse(g.out)).not.toThrow();
  });

  it('dot --in <file> --out <file> keeps stdout empty and writes DOT with \\n', () => {
    const dir = mkdtempSync(join(tmpdir(), 'motor-out-'));
    const src = join(dir, 'src.json');
    const dst = join(dir, 'out.dot');

    const g = run(['gen', '--kind', 'chain', '--n', '3', '--format', 'json']);
    writeFileSync(src, g.out, 'utf-8');

    const r = run(['dot', '--in', src, '--out', dst]);
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out).toBe('');

    const txt = readFileSync(dst, 'utf-8');
    expect(txt.length).toBeGreaterThan(0);
    expect(txt.endsWith('\n')).toBe(true);
    expect(txt).toMatch(/digraph|graph/i);
  });

  it('json --in <file> --out <file> keeps stdout empty and writes JSON with \\n', () => {
    const dir = mkdtempSync(join(tmpdir(), 'motor-out-'));
    const src = join(dir, 'src.json');
    const dst = join(dir, 'out.json');

    const g = run(['gen', '--kind', 'chain', '--n', '3', '--format', 'json']);
    writeFileSync(src, g.out, 'utf-8');

    const r = run(['json', '--in', src, '--out', dst]);
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out).toBe('');

    const txt = readFileSync(dst, 'utf-8');
    expect(txt.length).toBeGreaterThan(0);
    expect(txt.endsWith('\n')).toBe(true);
    expect(() => JSON.parse(txt)).not.toThrow();
  });

  it('stats --format text --in <file> --out <file> keeps stdout empty and writes text with \\n', () => {
    const dir = mkdtempSync(join(tmpdir(), 'motor-out-'));
    const src = join(dir, 'src.json');
    const dst = join(dir, 'out.txt');

    const g = run(['gen', '--kind', 'chain', '--n', '3', '--format', 'json']);
    writeFileSync(src, g.out, 'utf-8');

    const r = run(['stats', '--in', src, '--format', 'text', '--out', dst]);
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out).toBe('');

    const txt = readFileSync(dst, 'utf-8');
    expect(txt.length).toBeGreaterThan(0);
    expect(txt.endsWith('\n')).toBe(true);
    expect(txt).toMatch(/nodes:/);
    expect(txt).toMatch(/edges:/);
  });

  it('stats --format json --in <file> --out <file> keeps stdout empty and writes JSON with \\n', () => {
    const dir = mkdtempSync(join(tmpdir(), 'motor-out-'));
    const src = join(dir, 'src.json');
    const dst = join(dir, 'stats.json');

    const g = run(['gen', '--kind', 'chain', '--n', '3', '--format', 'json']);
    writeFileSync(src, g.out, 'utf-8');

    const r = run(['stats', '--in', src, '--format', 'json', '--out', dst]);
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out).toBe('');

    const txt = readFileSync(dst, 'utf-8');
    expect(txt.length).toBeGreaterThan(0);
    expect(txt.endsWith('\n')).toBe(true);

    const j = JSON.parse(txt);
    expect(typeof j).toBe('object');
    expect(j).toHaveProperty('nodes');
    expect(j).toHaveProperty('edges');
    expect(j).toHaveProperty('sccCount');
  });
});
