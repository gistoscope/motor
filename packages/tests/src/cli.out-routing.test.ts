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
  const result = spawnSync(process.execPath, [bin(), ...args], {
    encoding: 'utf-8',
    maxBuffer: 1024 * 1024,
    input: opts?.input ?? undefined
  });
  return { code: result.status ?? 0, out: result.stdout, err: result.stderr };
}

describe('motor --out routing', () => {
  it('gen --out writes file and keeps stdout empty', () => {
    const dir = mkdtempSync(join(tmpdir(), 'motor-out-'));
    const outPath = join(dir, 'g.json');

    const r = run(['gen', '--kind', 'chain', '--n', '3', '--format', 'json', '--out', outPath]);
    expect(r.code).toBe(0);
    expect(r.out).toBe('');

    const txt = readFileSync(outPath, 'utf-8');
    expect(txt.length).toBeGreaterThan(0);
    expect(txt.endsWith('\n')).toBe(true);
  });

  it('inspect --in <file> --out <file> keeps stdout empty', () => {
    const dir = mkdtempSync(join(tmpdir(), 'motor-out-'));
    const src = join(dir, 'src.json');
    const dst = join(dir, 'dst.txt');

    const g = run(['gen', '--kind', 'chain', '--n', '3', '--format', 'json']);
    expect(g.code).toBe(0);
    writeFileSync(src, g.out, 'utf-8');

    const r = run(['inspect', '--in', src, '--out', dst]);
    expect(r.code).toBe(0);
    expect(r.out).toBe('');

    const txt = readFileSync(dst, 'utf-8');
    expect(txt.length).toBeGreaterThan(0);
    expect(txt.endsWith('\n')).toBe(true);
  });
});
