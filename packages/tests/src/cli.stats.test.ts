import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function bin() {
  const url = new URL('../../cli/bin/motor.js', import.meta.url);
  return fileURLToPath(url);
}
function run(args: string[], input?: string) {
  const res = spawnSync(process.execPath, [bin(), ...args], {
    input, encoding: 'utf-8', maxBuffer: 1024 * 1024,
  });
  return { code: res.status ?? 0, out: res.stdout, err: res.stderr };
}

const CHAIN3 = JSON.stringify({
  nodes: [{id:'1',label:'1'},{id:'2',label:'2'},{id:'3',label:'3'}],
  edges: [{from:'1',to:'2'},{from:'2',to:'3'}],
});

const CYCLE3 = JSON.stringify({
  nodes: [{id:'1',label:'1'},{id:'2',label:'2'},{id:'3',label:'3'}],
  edges: [{from:'1',to:'2'},{from:'2',to:'3'},{from:'3',to:'1'}],
});

describe('motor stats', () => {
  it('text format summarises basic metrics (stdin)', () => {
    const r = run(['stats'], CHAIN3);
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out).toMatch(/nodes:\s*3/);
    expect(r.out).toMatch(/edges:\s*2/);
    expect(r.out).toMatch(/outDegree:\s*min=0 max=1/);
    expect(r.out).toMatch(/inDegree:\s*min=0 max=1/);
    expect(r.out).toMatch(/hasCycle:\s*false/);
    expect(r.out).toMatch(/sccCount:\s*3/); // DAG ⇒ каждая вершина — КСС
    expect(r.out.endsWith('\n')).toBe(true);
  });

  it('json format is parseable and stable', () => {
    const dir = mkdtempSync(join(tmpdir(), 'motor-'));
    const p = join(dir, 'g.json');
    writeFileSync(p, CYCLE3, 'utf-8');
    const r = run(['stats','--in', p, '--format', 'json']);
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    const j = JSON.parse(r.out);
    expect(j.nodes).toBe(3);
    expect(j.edges).toBe(3);
    expect(j.hasCycle).toBe(true);
    expect(j.sccCount).toBe(1);
  });

  it('invalid JSON → exit 1 with error message', () => {
    const r = run(['stats'], '{');
    expect(r.code).toBe(1);
    expect(r.out).toBe('');
    expect(r.err).toMatch(/^invalid JSON:/); // следуем существующей семантике
  });
});
