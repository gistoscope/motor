import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

function bin() {
  const url = new URL('../../cli/bin/motor.js', import.meta.url);
  return fileURLToPath(url);
}
function run(args: string[], input?: string) {
  const r = spawnSync(process.execPath, [bin(), ...args], {
    encoding: 'utf-8', maxBuffer: 1024 * 1024, input
  });
  return { code: r.status ?? 0, out: r.stdout, err: r.stderr };
}

const sample = JSON.stringify({
  nodes: [{ id: 'A', label: 'A' }, { id: 'B', label: 'B' }],
  edges: [{ from: 'A', to: 'B' }]
});

describe('json --pretty', () => {
  it('pretty=0 -> minified + trailing \\n', () => {
    const r = run(['json', '--pretty', '0'], sample);
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out.endsWith('\n')).toBe(true);
    const body = r.out.slice(0, -1);
    expect(body).not.toMatch(/\n\s+/); // no pretty spaces
    expect(JSON.parse(body)).toBeTruthy();
  });

  it('pretty=2 -> indented + trailing \\n', () => {
    const r = run(['json', '--pretty', '2'], sample);
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out.endsWith('\n')).toBe(true);
    expect(r.out).toMatch(/\n\s{2}"/);
    expect(JSON.parse(r.out)).toBeTruthy();
  });

  it('pretty=4 -> indented + trailing \\n', () => {
    const r = run(['json', '--pretty', '4'], sample);
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out.endsWith('\n')).toBe(true);
    expect(r.out).toMatch(/\n\s{4}"/);
    expect(JSON.parse(r.out)).toBeTruthy();
  });

  it('default (no flag) == pretty=2', () => {
    const a = run(['json'], sample);
    const b = run(['json', '--pretty', '2'], sample);
    expect(a.out).toBe(b.out);
  });
});
