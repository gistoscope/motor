import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

function bin() {
  const url = new URL('../../cli/bin/motor.js', import.meta.url);
  return fileURLToPath(url);
}
function run(args: string[]) {
  const r = spawnSync(process.execPath, [bin(), ...args], {
    encoding: 'utf-8', maxBuffer: 1024 * 1024
  });
  return { code: r.status ?? 0, out: r.stdout, err: r.stderr };
}

describe('help Examples', () => {
  it('top-level help contains Examples with key lines', () => {
    const r = run(['--help']);
    expect(r.code).toBe(0);
    expect(r.err).toBe('');
    expect(r.out).toContain('Examples:');
    expect(r.out).toContain('motor inspect --in graph.json');
    expect(r.out).toContain('motor gen --kind chain --n 3 --format inspect');
    expect(r.out).toContain('motor gen --kind chain --n 3 --format json | motor stats --format json');
    expect(r.out.endsWith('\n')).toBe(true);
  });
});
