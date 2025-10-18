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

describe('motor gen grid', () => {
  it('rows=2 cols=3 -> json counts and ids', () => {
    const r = run(['gen', '--kind', 'grid', '--rows', '2', '--cols', '3', '--format', 'json']);
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    const j = JSON.parse(r.out);
    expect(j.nodes).toHaveLength(6);
    expect(j.nodes.map((n: any) => n.id)).toEqual([
      'g_r1_c1',
      'g_r1_c2',
      'g_r1_c3',
      'g_r2_c1',
      'g_r2_c2',
      'g_r2_c3'
    ]);
    expect(j.edges).toHaveLength(7);
    expect(j.edges[0]).toEqual({ from: 'g_r1_c1', to: 'g_r1_c2' });
    expect(j.edges[j.edges.length - 1]).toEqual({ from: 'g_r2_c2', to: 'g_r2_c3' });
  });

  it('rows=2 cols=2 -> inspect snapshot with trailing newline', () => {
    const r = run(['gen', '--kind', 'grid', '--rows', '2', '--cols', '2', '--format', 'inspect']);
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out.endsWith('\n')).toBe(true);
    expect(r.out).toMatchSnapshot();
  });

  it('rows=2 cols=2 -> dot snapshot with trailing newline', () => {
    const r = run(['gen', '--kind', 'grid', '--rows', '2', '--cols', '2', '--format', 'dot', '--name', 'Grid']);
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out.endsWith('\n')).toBe(true);
    expect(r.out).toMatchSnapshot();
  });
});
