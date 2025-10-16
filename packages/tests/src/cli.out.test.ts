import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function bin() {
  const url = new URL('../../cli/bin/motor.js', import.meta.url);
  return fileURLToPath(url);
}
function run(args: string[], input?: string) {
  const res = spawnSync(process.execPath, [bin(), ...args], {
    input,
    encoding: 'utf-8',
    maxBuffer: 1024 * 1024,
  });
  return { code: res.status ?? 0, out: res.stdout, err: res.stderr };
}

const SAMPLE = JSON.stringify({
  nodes: [{ id: 'A', label: 'A' }, { id: 'B', label: 'B' }],
  edges: [{ from: 'A', to: 'B' }],
});

describe('cli --out for json|dot|inspect', () => {
  it('json --out writes file and keeps stdout empty', () => {
    const dir = mkdtempSync(join(tmpdir(), 'motor-'));
    const inPath = join(dir, 'g.json');
    const outPath = join(dir, 'out.json');
    writeFileSync(inPath, SAMPLE, 'utf-8');

    const r = run(['json', '--in', inPath, '--out', outPath]);
    expect(r.code).toBe(0);
    expect(r.out).toBe('');
    const contents = readFileSync(outPath, 'utf-8');
    expect(contents.endsWith('\n')).toBe(true);
    const j = JSON.parse(contents);
    expect(j.nodes.map((n: any) => n.id)).toEqual(['A', 'B']);
    expect(j.edges).toEqual([{ from: 'A', to: 'B' }]);
  });

  it('dot --out writes file with trailing newline', () => {
    const dir = mkdtempSync(join(tmpdir(), 'motor-'));
    const inPath = join(dir, 'g.json');
    const outPath = join(dir, 'g.dot');
    writeFileSync(inPath, SAMPLE, 'utf-8');

    const r = run(['dot', '--in', inPath, '--name', 'G', '--out', outPath]);
    expect(r.code).toBe(0);
    expect(r.out).toBe('');
    const contents = readFileSync(outPath, 'utf-8');
    expect(contents.includes('digraph G {')).toBe(true);
    expect(contents.endsWith('\n')).toBe(true);
  });

  it('inspect --out writes file with trailing newline', () => {
    const dir = mkdtempSync(join(tmpdir(), 'motor-'));
    const inPath = join(dir, 'g.json');
    const outPath = join(dir, 'dump.txt');
    writeFileSync(inPath, SAMPLE, 'utf-8');

    const r = run(['inspect', '--in', inPath, '--out', outPath]);
    expect(r.code).toBe(0);
    expect(r.out).toBe('');
    const contents = readFileSync(outPath, 'utf-8');
    expect(/^nodes:\s*".*"\s*\[.*\]\nedges:/m.test(contents)).toBe(true);
    expect(contents.endsWith('\n')).toBe(true);
  });
});
