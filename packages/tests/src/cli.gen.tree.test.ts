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

describe('gen tree', () => {
  it('B=2, L=3 → nodes=7, edges=6', () => {
    const r = run(['gen','--kind','tree','--branching','2','--levels','3','--format','json']);
    expect(r.code).toBe(0);
    const j = JSON.parse(r.out);
    expect(j.nodes.length).toBe(7);
    expect(j.edges.length).toBe(6);
    expect(r.out.endsWith('\n')).toBe(true);
  });

  it('B=1, L=4 → chain of 4 (edges=3)', () => {
    const r = run(['gen','--kind','tree','--branching','1','--levels','4','--format','json']);
    expect(r.code).toBe(0);
    const j = JSON.parse(r.out);
    expect(j.nodes.length).toBe(4);
    expect(j.edges.length).toBe(3);
  });

  it('invalid flags → exit 1, stderr', () => {
    const r = run(['gen','--kind','tree','--branching','-1','--levels','2']);
    expect(r.code).toBe(1);
    expect(r.out).toBe('');
    expect(r.err).toMatch(/branching|levels/i);
  });
});
