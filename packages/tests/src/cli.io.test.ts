import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  createGraph, addNode, addEdge, makeId, node, edge,
  toJSON, toDOT, inspect as inspectGraph
} from '@motor/grasp';

function binPath() {
  // packages/tests/src -> ../../cli/bin/motor.js
  const url = new URL('../../cli/bin/motor.js', import.meta.url);
  return fileURLToPath(url);
}

function run(args: string[], input?: string) {
  const res = spawnSync('node', [binPath(), ...args], {
    encoding: 'utf8',
    input
  });
  return { code: res.status ?? -1, out: (res.stdout ?? '').trim(), err: (res.stderr ?? '').trim() };
}

const A = makeId('A'), B = makeId('B'), C = makeId('C');

function small() {
  const g = createGraph();
  [A, B, C].forEach(id => addNode(g, node(id, String(id))));
  addEdge(g, edge(A, B));
  addEdge(g, edge(B, C));
  return g;
}

describe('motor CLI io commands', () => {
  it('inspect --in FILE prints deterministic dump', () => {
    const g = small();
    const j = toJSON(g);
    const dir = mkdtempSync(join(tmpdir(), 'motor-'));
    const p = join(dir, 'in.json');
    writeFileSync(p, JSON.stringify(j, null, 2));
    const { code, out, err } = run(['inspect', '--in', p]);
    expect(code).toBe(0);
    expect(err).toBe('');
    expect(out).toBe(inspectGraph(g));
  });

  it('dot --in FILE --name T prints deterministic DOT', () => {
    const g = small();
    const j = toJSON(g);
    const dir = mkdtempSync(join(tmpdir(), 'motor-'));
    const p = join(dir, 'in.json');
    writeFileSync(p, JSON.stringify(j, null, 2));
    const { code, out, err } = run(['dot', '--in', p, '--name', 'T']);
    expect(code).toBe(0);
    expect(err).toBe('');
    expect(out).toBe(toDOT(g, { graphName: 'T' }));
  });

  it('json --in FILE prints normalized JSON', () => {
    const g = small();
    const j = toJSON(g);
    const dir = mkdtempSync(join(tmpdir(), 'motor-'));
    const p = join(dir, 'in.json');
    // deliberately shuffle keys to test normalization
    writeFileSync(p, JSON.stringify({ edges: j.edges, nodes: j.nodes }, null, 2));
    const { code, out, err } = run(['json', '--in', p]);
    expect(code).toBe(0);
    expect(err).toBe('');
    expect(out + '\n').toBe(JSON.stringify(toJSON(g), null, 2) + '\n'); // ensure trailing newline
  });

  it('json reads from stdin when --in not provided', () => {
    const g = small();
    const j = toJSON(g);
    const { code, out, err } = run(['json'], JSON.stringify(j));
    expect(code).toBe(0);
    expect(err).toBe('');
    expect(out + '\n').toBe(JSON.stringify(toJSON(g), null, 2) + '\n');
  });

  it('fails with non-GraphJSON input', () => {
    const bad = JSON.stringify({ nodes: [{ id: '', label: 1 }], edges: [] });
    const { code, err } = run(['json'], bad);
    expect(code).toBe(1);
    expect(err).toMatch(/Invalid GraphJSON|Failed to read\/parse/i);
  });
});
