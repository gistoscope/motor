import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function bin() {
  const url = new URL('../../cli/bin/motor.js', import.meta.url);
  return fileURLToPath(url);
}

function run(args: string[], input?: string) {
  const res = spawnSync(process.execPath, [bin(), ...args], {
    input,
    encoding: 'utf-8',
    maxBuffer: 1024 * 1024,
  });
  return { code: res.status ?? 0, out: res.stdout, err: res.stderr };
}

describe('motor validate', () => {
  it('prints OK and exits 0 for valid GraphJSON (stdin)', () => {
    const json = JSON.stringify({
      nodes: [{ id: 'A', label: 'A' }, { id: 'B', label: 'B' }],
      edges: [{ from: 'A', to: 'B' }],
    });
    const r = run(['validate'], json);
    expect(r.code).toBe(0);
    expect(r.out).toBe('OK\n');
    expect(r.err).toBe('');
  });

  it('reads from file via --in and exits 0', () => {
    const dir = mkdtempSync(join(tmpdir(), 'motor-'));
    const p = join(dir, 'g.json');
    writeFileSync(p, JSON.stringify({
      nodes: [{ id: 'X', label: 'X' }],
      edges: [],
    }), 'utf-8');
    const r = run(['validate', '--in', p]);
    expect(r.code).toBe(0);
    expect(r.out).toBe('OK\n');
    expect(r.err).toBe('');
  });

  it('reports invalid JSON and exits 1', () => {
    const r = run(['validate'], '{');
    expect(r.code).toBe(1);
    expect(r.out).toBe('');
    expect(r.err).toMatch(/^invalid JSON:/);
  });

  it('reports GraphJSON errors and exits 1', () => {
    const bad = JSON.stringify({ nodes: [{ id: 'A', label: 'A' }], edges: [{ from: 'A', to: 'Z' }] });
    const r = run(['validate'], bad);
    expect(r.code).toBe(1);
    expect(r.out).toBe('');
    expect(r.err).toMatch(/- edges\[0\]\.to references missing node "Z"/);
  });

  it('errors when no input is provided', () => {
    const r = run(['validate']); // no stdin data
    // Depending on how main detects empty stdin, allow either message:
    expect(r.code).toBe(1);
    expect(r.out).toBe('');
    expect(r.err).toMatch(/no input; provide --in FILE or pipe JSON|invalid JSON/);
  });
});
