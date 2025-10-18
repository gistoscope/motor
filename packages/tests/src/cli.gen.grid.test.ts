import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

function bin() {
  const url = new URL('../../cli/bin/motor.js', import.meta.url);
  return fileURLToPath(url);
}
function run(args: string[]) {
  const r = spawnSync(process.execPath, [bin(), ...args], { encoding: 'utf-8', maxBuffer: 1024*1024 });
  return { code: r.status ?? 0, out: r.stdout, err: r.stderr };
}

describe('gen grid', () => {
  it('json: counts nodes/edges and trailing NL', () => {
    const R=2, C=3;
    const r = run(['gen','--kind','grid','--rows', String(R),'--cols', String(C),'--format','json']);
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out.endsWith('\n')).toBe(true);
    const j = JSON.parse(r.out);
    expect(j.nodes.length).toBe(R*C);
    const expectedEdges = R*(C-1) + C*(R-1);
    expect(j.edges.length).toBe(expectedEdges);
  });

  it('dot: has digraph and trailing NL', () => {
    const r = run(['gen','--kind','grid','--rows','2','--cols','2','--format','dot','--name','G']);
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out).toMatch(/digraph/);
    expect(r.out.endsWith('\n')).toBe(true);
  });

  it('invalid flags → exit 1, stderr, stdout empty', () => {
    const r = run(['gen','--kind','grid','--rows','0','--cols','2']);
    expect(r.code).toBe(1);
    expect(r.out).toBe('');
    expect(r.err).toMatch(/rows|cols/i);
    expect(r.err.endsWith('\n')).toBe(true);
  });
});
