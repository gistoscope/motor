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

describe('gen bipartite', () => {
  it('L=2, R=3 → nodes=5, edges=6 + trailing NL', () => {
    const r = run(['gen','--kind','bipartite','--left','2','--right','3','--format','json']);
    expect(r.code).toBe(0);
    const j = JSON.parse(r.out);
    expect(j.nodes.length).toBe(5);
    expect(j.edges.length).toBe(6);
    expect(r.out.endsWith('\n')).toBe(true);
  });

  it('dot has digraph', () => {
    const r = run(['gen','--kind','bipartite','--left','1','--right','1','--format','dot']);
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out).toMatch(/digraph/);
  });

  it('invalid flags → exit 1, stderr', () => {
    const r = run(['gen','--kind','bipartite','--left','0','--right','2']);
    expect(r.code).toBe(1);
    expect(r.out).toBe('');
    expect(r.err).toMatch(/left|right/i);
  });
});
