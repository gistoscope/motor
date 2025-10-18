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

describe('motor gen bipartite', () => {
  it('left=2 right=3 -> json counts and orientation', () => {
    const r = run(['gen', '--kind', 'bipartite', '--left', '2', '--right', '3', '--format', 'json']);
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    const j = JSON.parse(r.out);
    expect(j.nodes.map((n: any) => n.id)).toEqual([
      'bL_1',
      'bL_2',
      'bR_1',
      'bR_2',
      'bR_3'
    ]);
    expect(j.edges).toEqual([
      { from: 'bL_1', to: 'bR_1' },
      { from: 'bL_1', to: 'bR_2' },
      { from: 'bL_1', to: 'bR_3' },
      { from: 'bL_2', to: 'bR_1' },
      { from: 'bL_2', to: 'bR_2' },
      { from: 'bL_2', to: 'bR_3' }
    ]);
  });

  it('left=1 right=0 -> inspect snapshot with trailing newline', () => {
    const r = run(['gen', '--kind', 'bipartite', '--left', '1', '--right', '0', '--format', 'inspect']);
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out.endsWith('\n')).toBe(true);
    expect(r.out).toMatchSnapshot();
  });

  it('left=1 right=0 -> dot snapshot with trailing newline', () => {
    const r = run(['gen', '--kind', 'bipartite', '--left', '1', '--right', '0', '--format', 'dot', '--name', 'Bi']);
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out.endsWith('\n')).toBe(true);
    expect(r.out).toMatchSnapshot();
  });
});
