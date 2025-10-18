import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

function bin() {
  const url = new URL('../../cli/bin/motor.js', import.meta.url);
  return fileURLToPath(url);
}

function run(args: string[]) {
  const res = spawnSync(process.execPath, [bin(), ...args], {
    encoding: 'utf-8',
    maxBuffer: 1024 * 1024
  });
  return { code: res.status ?? 0, out: res.stdout, err: res.stderr };
}

describe('motor gen tree', () => {
  it('arity=2 depth=2 -> json counts and edges', () => {
    const r = run(['gen', '--kind', 'tree', '--arity', '2', '--depth', '2', '--format', 'json']);
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    const j = JSON.parse(r.out);
    expect(j.nodes).toHaveLength(7);
    expect(j.nodes.map((n: any) => n.id)).toEqual([
      't_0',
      't_1',
      't_2',
      't_3',
      't_4',
      't_5',
      't_6'
    ]);
    expect(j.edges).toEqual([
      { from: 't_0', to: 't_1' },
      { from: 't_0', to: 't_2' },
      { from: 't_1', to: 't_3' },
      { from: 't_1', to: 't_4' },
      { from: 't_2', to: 't_5' },
      { from: 't_2', to: 't_6' }
    ]);
  });

  it('arity=3 depth=1 -> inspect snapshot with trailing newline', () => {
    const r = run(['gen', '--kind', 'tree', '--arity', '3', '--depth', '1', '--format', 'inspect']);
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out.endsWith('\n')).toBe(true);
    expect(r.out).toMatchSnapshot();
  });

  it('arity=3 depth=1 -> dot snapshot with trailing newline', () => {
    const r = run(['gen', '--kind', 'tree', '--arity', '3', '--depth', '1', '--format', 'dot', '--name', 'Tree']);
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out.endsWith('\n')).toBe(true);
    expect(r.out).toMatchSnapshot();
  });
});
