import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '..', '..');

const read = (relativePath: string): string => {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8');
};

describe('Repo Guard', () => {
  it('enforces pnpm-only workflows', () => {
    const rootPackage = JSON.parse(read('package.json')) as {
      packageManager?: string;
      engines?: { node?: string };
      scripts?: Record<string, string>;
    };

    expect(rootPackage.packageManager?.startsWith('pnpm@')).toBe(true);
    expect(rootPackage.engines?.node).toBe('20.19.5');
    expect(rootPackage.scripts).toMatchObject({
      build: expect.any(String),
      test: expect.any(String),
      verify: expect.any(String)
    });

    expect(existsSync(path.join(repoRoot, 'pnpm-lock.yaml'))).toBe(true);
    expect(existsSync(path.join(repoRoot, 'package-lock.json'))).toBe(false);
    expect(existsSync(path.join(repoRoot, 'yarn.lock'))).toBe(false);
  });

  it('keeps repo rules documented', () => {
    expect(existsSync(path.join(repoRoot, 'REPO_RULES.md'))).toBe(true);
    const rules = read('REPO_RULES.md');
    expect(rules).toContain('pnpm -w install --frozen-lockfile');
    expect(rules).toContain('sandbox');
  });

  it('guards the Husky pre-push hook', () => {
    const prePush = read('.husky/pre-push');
    expect(prePush).toContain('node scripts/generate-aliases.mjs');
    expect(prePush).toContain('node scripts/generate-aliases.mjs --check');
    expect(prePush).toContain('pnpm verify');
    expect(prePush).toContain('pnpm -r test');
    expect(prePush).toContain('node scripts/forbidden-tokens.cjs');
  });

  it('locks down CI expectations', () => {
    const workflow = read('.github/workflows/ci.yml');
    expect(workflow).toContain("node-version: '20.19.5'");
    expect(workflow).toContain('pnpm -w install --frozen-lockfile');
    expect(workflow).toContain('pnpm -r test');
    expect(workflow).toContain('node scripts/forbidden-tokens.cjs');
  });

  it('keeps artifacts out of git', () => {
    const gitignore = read('.gitignore');
    expect(gitignore).toContain('dist/');
    expect(gitignore).toMatch(/\*\.zip/);
  });
});
