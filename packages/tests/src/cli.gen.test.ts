import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function bin() {
  const url = new URL('../../cli/bin/motor.js', import.meta.url);
  return fileURLToPath(url);
}
function run(args: string[]) {
  const res = spawnSync(process.execPath, [bin(), ...args], {
    encoding: 'utf-8', maxBuffer: 1024 * 1024
  });
  return { code: res.status ?? 0, out: res.stdout, err: res.stderr };
}

describe('motor gen', () => {
  it('chain n=3 -> inspect to stdout', () => {
    const r = run(['gen', '--kind', 'chain', '--n', '3', '--format', 'inspect']);
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out).toMatch(/^nodes:\s*"1" \[1\], "2" \[2\], "3" \[3\]\nedges:\n\s+"1" -> "2"\n\s+"2" -> "3"\n?$/m);
  });

  it('cycle n=3 -> dot includes back edge 3->1', () => {
    const r = run(['gen', '--kind', 'cycle', '--n', '3', '--format', 'dot', '--name', 'G']);
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out).toContain('digraph G {');
    expect(r.out).toMatch(/"3" -> "1";/);
    expect(r.out.endsWith('\n')).toBe(true);
  });

  it('star n=3 -> json round-trip shape', () => {
    const r = run(['gen', '--kind', 'star', '--n', '3', '--format', 'json']);
    expect(r.code).toBe(0);
    const j = JSON.parse(r.out);
    expect(j.nodes.map((n: any) => n.id)).toEqual(['1', '2', '3']);
    // edges should be 1->2 and 1->3 in some order but deterministic
    expect(j.edges).toEqual([{ from: '1', to: '2' }, { from: '1', to: '3' }]);
  });

  it('writes to --out and keeps stdout empty', () => {
    const dir = mkdtempSync(join(tmpdir(), 'motor-'));
    const p = join(dir, 'g.dot');
    const r = run(['gen', '--kind', 'chain', '--n', '2', '--format', 'dot', '--out', p]);
    expect(r.code).toBe(0);
    expect(r.out).toBe('');
    const contents = readFileSync(p, 'utf-8');
    expect(contents).toContain('"1" -> "2";');
    expect(contents.endsWith('\n')).toBe(true);
  });

  it('invalid flags -> exit 1 with error message', () => {
    const r1 = run(['gen']);
    expect(r1.code).toBe(1);
    expect(r1.err).toMatch(/invalid --kind/);

    const r2 = run(['gen', '--kind', 'chain', '--n', '0']);
    expect(r2.code).toBe(1);
    expect(r2.err).toMatch(/invalid --n/);

    const r3 = run(['gen', '--kind', 'star', '--n', '2', '--format', 'yaml']);
    expect(r3.code).toBe(1);
    expect(r3.err).toMatch(/invalid --format/);
  });
});
