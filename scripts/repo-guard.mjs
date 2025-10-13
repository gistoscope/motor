#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
process.chdir(repoRoot);

function fail(message) {
  console.error(`Repo Guard: ${message}`);
  process.exit(1);
}

function readFile(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

function parseJsonWithDuplicateKeyCheck(filePath) {
  const raw = readFile(filePath);
  const seenKeys = new WeakMap();
  const duplicates = new Set();
  const parsed = JSON.parse(raw, function (key, value) {
    if (!key) {
      return value;
    }
    const parent = this;
    if (Object.prototype.toString.call(parent) === '[object Object]') {
      let keys = seenKeys.get(parent);
      if (!keys) {
        keys = new Set();
        seenKeys.set(parent, keys);
      }
      if (keys.has(key)) {
        duplicates.add(key);
      } else {
        keys.add(key);
      }
    }
    return value;
  });

  if (duplicates.size > 0) {
    fail(`Duplicate keys in ${filePath}: ${Array.from(duplicates).join(', ')}`);
  }

  return { parsed, raw };
}

const pkg = parseJsonWithDuplicateKeyCheck('package.json');
const pkgJson = pkg.parsed;

if (pkgJson.engines?.node !== '>=20 <21') {
  fail(`package.json engines.node must be ">=20 <21" but was ${pkgJson.engines?.node || 'missing'}`);
}

if (pkgJson.packageManager !== 'pnpm@9.12.0') {
  fail(`package.json packageManager must be pnpm@9.12.0 but was ${pkgJson.packageManager || 'missing'}`);
}

const workspaceText = readFile('pnpm-workspace.yaml');
if (workspaceText.includes('*')) {
  fail('pnpm-workspace.yaml must not contain wildcard entries');
}
const workspaceLines = workspaceText.split(/\r?\n/);
const workspacePackages = [];
let inPackages = false;
for (const line of workspaceLines) {
  if (!inPackages) {
    if (line.trim() === 'packages:') {
      inPackages = true;
    }
    continue;
  }
  const match = line.match(/^\s*-\s+(.*)$/);
  if (match) {
    const entry = match[1].trim().replace(/^['"]|['"]$/g, '');
    if (!entry) {
      fail('pnpm-workspace.yaml contains an empty package entry');
    }
    workspacePackages.push(entry);
  } else if (line.trim() && !line.startsWith(' ')) {
    break;
  }
}

const packagesDir = path.join(repoRoot, 'packages');
const actualPackages = fs
  .readdirSync(packagesDir, { withFileTypes: true })
  .filter((dirent) => dirent.isDirectory())
  .map((dirent) => `packages/${dirent.name}`)
  .filter((rel) => fs.existsSync(path.join(repoRoot, rel, 'package.json')))
  .filter((rel) => rel !== 'packages/spark')
  .sort();

const sortedWorkspace = [...workspacePackages].sort();
if (workspacePackages.length !== sortedWorkspace.length || !workspacePackages.every((p, idx) => p === sortedWorkspace[idx])) {
  fail('pnpm-workspace.yaml packages must be sorted and deterministic');
}

if (workspacePackages.length !== actualPackages.length || !workspacePackages.every((pkgPath, idx) => pkgPath === actualPackages[idx])) {
  const missing = actualPackages.filter((pkgPath) => !workspacePackages.includes(pkgPath));
  const extra = workspacePackages.filter((pkgPath) => !actualPackages.includes(pkgPath));
  const parts = [];
  if (missing.length) {
    parts.push(`missing entries: ${missing.join(', ')}`);
  }
  if (extra.length) {
    parts.push(`unexpected entries: ${extra.join(', ')}`);
  }
  fail(`pnpm-workspace.yaml packages do not match actual workspace (${parts.join('; ')})`);
}

if (fs.existsSync(path.join(repoRoot, 'packages', 'spark'))) {
  fail('packages/spark must not exist');
}

const gitignoreContent = readFile('.gitignore').replace(/\r\n/g, '\n');
const gitignoreLines = gitignoreContent.split('\n');
if (!gitignoreLines.includes('dist/')) {
  fail('.gitignore must include dist/');
}
if (!gitignoreLines.includes('*.zip')) {
  fail('.gitignore must include *.zip');
}

const gitattributesLines = readFile('.gitattributes').replace(/\r\n/g, '\n').split('\n');
if (!gitattributesLines.includes('* text=auto eol=lf')) {
  fail('.gitattributes must include "* text=auto eol=lf"');
}

const huskyContent = readFile('.husky/pre-push').replace(/\r\n/g, '\n');
const expectedHook = [
  '#!/usr/bin/env sh',
  '. "$(dirname -- "$0")/_/husky.sh"',
  'pnpm -w verify || exit 1',
  'pnpm -w test || exit 1',
  "if pnpm -w run | grep -q '^forbidden-tokens'; then pnpm -w run forbidden-tokens || exit 1; fi",
].join('\n');
if (huskyContent !== expectedHook && huskyContent !== `${expectedHook}\n`) {
  fail('.husky/pre-push must match the required script');
}

const baseRef = process.env.GITHUB_BASE_REF;
if (baseRef && baseRef !== 'sandbox') {
  fail(`Pull requests must target sandbox (received ${baseRef})`);
}

let diffOutput;
try {
  diffOutput = execSync('git diff --name-status --no-color HEAD^', { encoding: 'utf8' });
} catch {
  diffOutput = execSync('git show --pretty="" --name-status', { encoding: 'utf8' });
}

const allowedExact = new Set([
  'pnpm-workspace.yaml',
  'pnpm-lock.yaml',
  'package.json',
  '.gitignore',
  '.gitattributes',
  '.husky/pre-push',
  '.github/workflows/ci.yml',
  'scripts/repo-guard.mjs',
]);

const allowedSparkPrefix = 'packages/spark/';

const diffLines = diffOutput
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

for (const line of diffLines) {
  const parts = line.split(/\s+/);
  const status = parts[0];
  if (parts.length !== 2) {
    fail(`Unexpected diff line format: ${line}`);
  }
  const filePath = parts[1];
  if (filePath.startsWith(allowedSparkPrefix)) {
    if (status !== 'D') {
      fail('packages/spark changes must be removals only');
    }
    continue;
  }
  if (!allowedExact.has(filePath)) {
    fail(`Unauthorized path modified: ${filePath}`);
  }
}

const ciWorkflow = readFile('.github/workflows/ci.yml');
if (!ciWorkflow.includes('corepack prepare pnpm@9.12.0 --activate')) {
  fail('CI workflow must pin pnpm@9.12.0 with corepack');
}
if (!ciWorkflow.includes('pnpm -w install --frozen-lockfile')) {
  fail('CI workflow must perform a frozen pnpm install');
}

const ciLines = ciWorkflow.split(/\r?\n/);
let currentRunCount = 0;
for (const line of ciLines) {
  if (/^\s*-\s+/.test(line)) {
    currentRunCount = 0;
    if (line.includes(' run:')) {
      currentRunCount += 1;
      if (currentRunCount > 1) {
        fail('Each CI step may only include a single run command');
      }
    }
    continue;
  }
  if (/^\s+run:/.test(line)) {
    currentRunCount += 1;
    if (currentRunCount > 1) {
      fail('Each CI step may only include a single run command');
    }
  }
}

