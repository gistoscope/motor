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
    // ВАЖНО: НЕ передавать input → имитируем "нет stdin"
  });
  return { code: r.status ?? 0, out: r.stdout, err: r.stderr };
}

describe('empty stdin without --in → unified error', () => {
  const CMDS = [
    ['inspect'],
    ['dot'],
    ['json'],
    ['stats'],
    ['stats', '--format', 'json'],
  ];

  for (const args of CMDS) {
    it(`${args.join(' ')} → stderr "no input; ..." + exit 1, stdout empty`, () => {
      const r = run(args);
      expect(r.code).toBe(1);
      expect(r.out).toBe('');
      expect(r.err).toMatch(/no input; provide --in FILE or pipe JSON/);
      expect(r.err.endsWith('\n')).toBe(true);
    });
  }
});
