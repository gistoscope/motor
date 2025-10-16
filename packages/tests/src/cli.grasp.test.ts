import { describe, it, expect } from 'vitest';
import { runCli } from '../../cli/src/cli';

const SMALL_JSON = JSON.stringify({
  nodes: [
    { id: 'A', label: 'A' },
    { id: 'B', label: 'B' },
    { id: 'C', label: 'C' },
  ],
  edges: [
    { from: 'A', to: 'B' },
    { from: 'B', to: 'C' },
  ],
}, null, 2);

const FILES = { 'g.json': SMALL_JSON };

describe('@motor/cli', () => {
  it('validate OK', async () => {
    const { code, stdout, stderr } = await runCli(['validate', 'g.json'], { vfs: FILES });
    expect(code).toBe(0);
    expect(stdout.trim()).toBe('OK');
    expect(stderr).toBe('');
  });

  it('inspect prints deterministic dump', async () => {
    const { code, stdout } = await runCli(['inspect', 'g.json'], { vfs: FILES });
    expect(code).toBe(0);
    expect(stdout.trim()).toBe([
      'nodes: "A" [A], "B" [B], "C" [C]',
      'edges:',
      '  "A" -> "B"',
      '  "B" -> "C"',
    ].join('\n'));
  });

  it('dot emits deterministic DOT (with name)', async () => {
    const { code, stdout } = await runCli(['dot', 'g.json', '--name', 'T'], { vfs: FILES });
    expect(code).toBe(0);
    expect(stdout.trim()).toBe([
      'digraph T {',
      '  "A" [label="A"];',
      '  "B" [label="B"];',
      '  "C" [label="C"];',
      '  "A" -> "B";',
      '  "B" -> "C";',
      '}',
    ].join('\n'));
  });

  it('to-json normalizes and sorts', async () => {
    const { code, stdout } = await runCli(['to-json', 'g.json'], { vfs: FILES });
    expect(code).toBe(0);
    const obj = JSON.parse(stdout);
    expect(obj).toEqual({
      nodes: [
        { id: 'A', label: 'A' },
        { id: 'B', label: 'B' },
        { id: 'C', label: 'C' },
      ],
      edges: [
        { from: 'A', to: 'B' },
        { from: 'B', to: 'C' },
      ],
    });
  });

  it('traverse bfs', async () => {
    const { code, stdout } = await runCli(['traverse', 'g.json', '--bfs', 'A'], { vfs: FILES });
    expect(code).toBe(0);
    expect(JSON.parse(stdout)).toEqual(['A', 'B', 'C']);
  });

  it('traverse dfs', async () => {
    const { code, stdout } = await runCli(['traverse', 'g.json', '--dfs', 'A'], { vfs: FILES });
    expect(code).toBe(0);
    expect(JSON.parse(stdout)).toEqual(['A', 'B', 'C']);
  });

  it('path-exists true/false', async () => {
    const t1 = await runCli(['path-exists', 'g.json', '--from', 'A', '--to', 'C'], { vfs: FILES });
    expect(t1.code).toBe(0);
    expect(t1.stdout.trim()).toBe('true');

    const t2 = await runCli(['path-exists', 'g.json', '--from', 'D', '--to', 'C'], { vfs: FILES });
    expect(t2.code).toBe(0);
    expect(t2.stdout.trim()).toBe('false');
  });

  it('shortest-path', async () => {
    const { code, stdout } = await runCli(['shortest-path', 'g.json', '--from', 'A', '--to', 'C'], { vfs: FILES });
    expect(code).toBe(0);
    expect(JSON.parse(stdout)).toEqual(['A', 'B', 'C']);
  });

  it('invalid json surfaces errors', async () => {
    const badFiles = { 'bad.json': '{ "nodes": "oops", "edges": [] }' };
    const { code, stdout, stderr } = await runCli(['validate', 'bad.json'], { vfs: badFiles });
    expect(code).toBe(1);
    expect(stdout).toBe('');
    expect(stderr).toMatch(/nodes must be an array/);
  });
});
