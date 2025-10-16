import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createGraph, addNode, addEdge, makeId, node, edge, toJSON } from '@motor/grasp';

function binPath() {
  const url = new URL('../../cli/bin/motor.js', import.meta.url);
  return fileURLToPath(url);
}

function run(args: string[], input?: string) {
  const res = spawnSync('node', [binPath(), ...args], { encoding: 'utf8', input });
  return { code: res.status ?? -1, out: (res.stdout ?? '').trim(), err: (res.stderr ?? '').trim() };
}

describe('motor validate', () => {
  it('prints OK and exit 0 on valid JSON', () => {
    const g = createGraph();
    const A = makeId('A'), B = makeId('B');
    addNode(g, node(A, 'A')); addNode(g, node(B, 'B')); addEdge(g, edge(A, B));
    const j = toJSON(g);
    const { code, out, err } = run(['validate'], JSON.stringify(j));
    expect(code).toBe(0);
    expect(err).toBe('');
    expect(out).toBe('OK');
  });

  it('prints errors and exit 1 on invalid JSON', () => {
    const bad = JSON.stringify({ nodes: [{ id: '', label: 1 }], edges: [] });
    const { code, out, err } = run(['validate'], bad);
    expect(code).toBe(1);
    expect(out).toBe('');
    expect(err).toMatch(/Invalid GraphJSON/i);
  });
});
