import { afterEach, describe, expect, it } from 'vitest';
import { rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = join(__dirname, '..', '..', '..');
const createdFiles: string[] = [];

afterEach(() => {
  for (const filePath of createdFiles.splice(0, createdFiles.length)) {
    try {
      rmSync(filePath);
    } catch {}
  }
});

describe('verify-web-imports script', () => {
  it("fails when '@motor/grasp' is imported from web sources", () => {
    const targetFile = join(ROOT, 'packages', 'web', 'src', '__tmp__forbidden-import.ts');
    writeFileSync(targetFile, "import '@motor/grasp';\n", 'utf8');
    createdFiles.push(targetFile);

    const result = spawnSync('node', [join(ROOT, 'scripts', 'verify-web-imports.mjs')], {
      cwd: ROOT,
      encoding: 'utf8',
    });

    expect(result.status).not.toBe(0);
    expect(result.stdout ?? '').not.toContain('[verify-web-imports] OK');
  });
});
