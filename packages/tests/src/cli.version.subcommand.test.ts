import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

function bin() {
  const url = new URL('../../cli/bin/motor.js', import.meta.url);
  return fileURLToPath(url);
}
function run(args: string[]) {
  const r = spawnSync(process.execPath, [bin(), ...args], {
    encoding: 'utf-8',
    maxBuffer: 1024 * 1024,
  });
  return { code: r.status ?? 0, out: r.stdout, err: r.stderr };
}

describe('motor version subcommand', () => {
  it('mirrors --version: same single-line stdout with trailing \\n; stderr empty; exit 0', () => {
    const flag = run(['--version']);
    const sub  = run(['version']);

    expect(flag.code).toBe(0);
    expect(sub.code).toBe(0);

    expect(flag.err).toBe('');
    expect(sub.err).toBe('');

    // Версия вида 1.2 или 1.2.3 — одна строка с \n
    expect(flag.out).toMatch(/^\d+\.\d+(?:\.\d+)?\n$/);
    expect(sub.out).toMatch(/^\d+\.\d+(?:\.\d+)?\n$/);

    // Должны быть идентичны
    expect(sub.out).toBe(flag.out);
  });
});
