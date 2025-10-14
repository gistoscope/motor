import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const errors = [];

function loadJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    errors.push(`Failed to read or parse ${path}: ${error.message}`);
    return null;
  }
}

const packageJsonPath = join(rootDir, 'package.json');
const packageJson = loadJson(packageJsonPath) ?? {};

if (packageJson.engines?.node !== '>=20 <21') {
  errors.push(
    `package.json engines.node must be ">=20 <21" but was ${JSON.stringify(packageJson.engines?.node)}`,
  );
}

if (packageJson.packageManager !== 'pnpm@9.12.0') {
  errors.push(
    `package.json packageManager must be "pnpm@9.12.0" but was ${JSON.stringify(packageJson.packageManager)}`,
  );
}

if (packageJson.scripts?.verify !== 'node scripts/verify-no-web.mjs') {
  errors.push(
    `package.json scripts.verify must be "node scripts/verify-no-web.mjs" but was ${JSON.stringify(packageJson.scripts?.verify)}`,
  );
}

const pnpmWorkspacePath = join(rootDir, 'pnpm-workspace.yaml');
let workspaceRaw = '';
try {
  workspaceRaw = readFileSync(pnpmWorkspacePath, 'utf8');
} catch (error) {
  errors.push(`Failed to read ${pnpmWorkspacePath}: ${error.message}`);
}

if (workspaceRaw.includes('*')) {
  errors.push('pnpm-workspace.yaml must not contain any wildcard characters ("*").');
}

const declaredPackages = [];
for (const line of workspaceRaw.split(/\r?\n/)) {
  const match = line.match(/^\s*-\s*(\S.*)$/);
  if (match) {
    declaredPackages.push(match[1]);
  }
}

const sortedDeclaredPackages = [...declaredPackages].sort();

const packagesDir = join(rootDir, 'packages');
const actualPackages = [];
for (const entry of readdirSync(packagesDir)) {
  if (entry === 'spark') {
    continue;
  }
  const fullPath = join(packagesDir, entry);
  const stats = statSync(fullPath, { throwIfNoEntry: false });
  if (!stats?.isDirectory()) {
    continue;
  }
  if (!existsSync(join(fullPath, 'package.json'))) {
    continue;
  }
  actualPackages.push(`packages/${entry}`);
}
actualPackages.sort();

if (declaredPackages.length === 0) {
  errors.push('pnpm-workspace.yaml must declare at least one package entry.');
}

if (!declaredPackages.every((pkg, index) => pkg === sortedDeclaredPackages[index])) {
  errors.push('pnpm-workspace.yaml packages must be sorted lexicographically.');
}

if (
  declaredPackages.length !== actualPackages.length ||
  !actualPackages.every((pkg, index) => pkg === declaredPackages[index])
) {
  errors.push(
    `pnpm-workspace.yaml packages mismatch. Expected ${JSON.stringify(actualPackages)}, received ${JSON.stringify(declaredPackages)}.`,
  );
}

if (errors.length > 0) {
  console.error('[repo-guard] FAIL');
  for (const error of errors) {
    console.error(` - ${error}`);
  }
  process.exit(1);
}

console.log('[repo-guard] OK');
