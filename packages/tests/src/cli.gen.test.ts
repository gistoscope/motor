import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  createGraph, addNode, addEdge, makeId, node, edge,
  toJSON, toDOT, inspect as inspectGraph
} from '@motor/grasp';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function binPath() {
  const url = new URL('../../cli/bin/motor.js', import.meta.url);
  return fileURLToPath(url);
}

function run(args: string[], input?: string) {
  const res = spawnSync('node', [binPath(), ...args], { encoding: 'utf8', input });
  return { code: res.status ?? -1, out: (res.stdout ?? '').trim(), err: (res.stderr ?? '').trim() };
}

function genChain(n: number) {
  const g = createGraph();
  const ids = [];
  for (let i = 1; i <= n; i++) {
    const id = makeId(String(i));
    ids.push(id);
    addNode(g, node(id, String(id)));
  }
  for (let i = 0; i < n - 1; i++) addEdge(g, edge(ids[i], ids[i + 1]));
  return g;
}

describe('motor gen', () => {
  it('gen chain json', () => {
    const g = genChain(3);
    const { code, out, err } = run(['gen', '--kind', 'chain', '--n', '3', '--format', 'json']);
    expect(code).toBe(0);
    expect(err).toBe('');
    expect(out + '\n').toBe(JSON.stringify(toJSON(g), null, 2) + '\n');
  });

  it('gen chain dot --name T', () => {
    const g = genChain(3);
    const { code, out, err } = run(['gen', '--kind', 'chain', '--n', '3', '--format', 'dot', '--name', 'T']);
    expect(code).toBe(0);
    expect(err).toBe('');
    expect(out).toBe(toDOT(g, { graphName: 'T' }));
  });

  it('gen chain inspect', () => {
    const g = genChain(3);
    const { code, out, err } = run(['gen', '--kind', 'chain', '--n', '3', '--format', 'inspect']);
    expect(code).toBe(0);
    expect(err).toBe('');
    expect(out).toBe(inspectGraph(g));
  });

  it('--out FILE writes to file', () => {
    const g = genChain(3);
    const dir = mkdtempSync(join(tmpdir(), 'motor-'));
    const p = join(dir, 'g.json');
    const { code, out, err } = run(['gen', '--kind', 'chain', '--n', '3', '--format', 'json', '--out', p]);
    expect(code).toBe(0);
    expect(out).toBe('');
    expect(err).toBe('');
    const text = readFileSync(p, 'utf8');
    expect(text).toBe(JSON.stringify(toJSON(g), null, 2) + '\n');
  });
});
