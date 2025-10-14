import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const packagesDir = join(rootDir, 'packages');

const excludedPackages = new Set(['spark', 'web']);

const compiled = [];
const skipped = [];
const skippedNoPackageJson = [];
const skippedNoTsconfig = [];

for (const entry of readdirSync(packagesDir)) {
  const fullPath = join(packagesDir, entry);
  if (!statSync(fullPath, { throwIfNoEntry: false })?.isDirectory()) {
    continue;
  }

  if (excludedPackages.has(entry)) {
    skipped.push(entry);
    continue;
  }

  const packageJsonPath = join(fullPath, 'package.json');
  if (!existsSync(packageJsonPath)) {
    skippedNoPackageJson.push(entry);
    continue;
  }

  const tsconfigPath = join(fullPath, 'tsconfig.json');
  if (!existsSync(tsconfigPath)) {
    skippedNoTsconfig.push(entry);
    continue;
  }

  console.log(`\n[verify-no-web] Checking ${entry}...`);
  const result = spawnSync('pnpm', ['-C', fullPath, 'exec', 'tsc', '-p', 'tsconfig.json', '--noEmit'], {
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(`\n[verify-no-web] Failed to run tsc for ${entry}:`, result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`\n[verify-no-web] TypeScript compilation failed for ${entry}.`);
    process.exit(result.status ?? 1);
  }

  compiled.push(entry);
}

console.log('\n[verify-no-web] Summary:');
console.log(`  Compiled packages (${compiled.length}): ${compiled.join(', ') || 'none'}`);
console.log(`  Skipped (excluded) (${skipped.length}): ${skipped.join(', ') || 'none'}`);
console.log(`  Skipped (no package.json) (${skippedNoPackageJson.length}): ${skippedNoPackageJson.join(', ') || 'none'}`);
console.log(`  Skipped (no tsconfig.json) (${skippedNoTsconfig.length}): ${skippedNoTsconfig.join(', ') || 'none'}`);

process.exit(0);
