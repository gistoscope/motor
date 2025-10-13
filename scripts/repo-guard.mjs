#!/usr/bin/env node
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

function fail(message) {
  console.error(`Repo Guard: ${message}`);
  process.exit(1);
}

function readJsonFile(path) {
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (err) {
    fail(`Unable to read ${path}: ${err.message}`);
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    fail(`${path} is not valid JSON: ${err.message}`);
  }
}

const pkg = readJsonFile('package.json');

if (!pkg.engines || pkg.engines.node !== '>=20 <21') {
  fail('package.json must declare engines.node as ">=20 <21"');
}

if (pkg.packageManager !== 'pnpm@9.12.0') {
  fail('package.json must pin packageManager to pnpm@9.12.0');
}

const allowList = readJsonFile('workspace.allowlist.json');
if (!Array.isArray(allowList) || allowList.some((entry) => typeof entry !== 'string')) {
  fail('workspace.allowlist.json must be an array of strings');
}

const sortedAllow = [...allowList].sort();
if (JSON.stringify(sortedAllow) !== JSON.stringify(allowList)) {
  fail('workspace.allowlist.json entries must be sorted');
}

const allowSet = new Set(allowList);

const workspaceRaw = readFileSync('pnpm-workspace.yaml', 'utf8');
if (workspaceRaw.includes('*')) {
  fail('pnpm-workspace.yaml must not contain globs');
}

const workspacePackages = [];
let inPackages = false;
for (const line of workspaceRaw.split(/\r?\n/)) {
  if (!inPackages) {
    if (line.trim() === 'packages:') {
      inPackages = true;
    }
    continue;
  }
  if (/^\s*-\s+/.test(line)) {
    const entry = line.replace(/^\s*-\s+/, '').trim();
    if (entry) {
      workspacePackages.push(entry);
    }
    continue;
  }
  if (line.trim() === '') {
    continue;
  }
  if (!line.startsWith(' ')) {
    break;
  }
}

if (workspacePackages.length === 0) {
  fail('pnpm-workspace.yaml must list at least one workspace package');
}

const sortedWorkspace = [...workspacePackages].sort();
if (JSON.stringify(sortedWorkspace) !== JSON.stringify(workspacePackages)) {
  fail('pnpm-workspace.yaml packages must be sorted');
}

if (workspacePackages.length !== allowList.length || workspacePackages.some((pkgName, index) => pkgName !== allowList[index])) {
  fail('pnpm-workspace.yaml packages must match workspace.allowlist.json');
}

const packagesDir = 'packages';
if (existsSync(packagesDir)) {
  const unexpected = [];
  for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dirName = entry.name;
    const fullPath = join(packagesDir, dirName);
    if (existsSync(join(fullPath, 'package.json'))) {
      const workspacePath = `${packagesDir}/${dirName}`;
      if (!allowSet.has(workspacePath)) {
        unexpected.push(workspacePath);
      }
    }
  }
  if (unexpected.length > 0) {
    fail(`Found workspace packages not in allow list: ${unexpected.join(', ')}`);
  }
}

for (const retired of ['packages/spark', 'packages/til']) {
  if (existsSync(retired)) {
    fail(`${retired} must be removed from the workspace`);
  }
}

const gitignoreLines = readFileSync('.gitignore', 'utf8').split(/\r?\n/);
if (!gitignoreLines.includes('dist/')) {
  fail('.gitignore must contain "dist/"');
}
if (!gitignoreLines.includes('*.zip')) {
  fail('.gitignore must contain "*.zip"');
}

const gitattributesLines = readFileSync('.gitattributes', 'utf8').replace(/\r\n/g, '\n').split('\n');
if (!gitattributesLines.includes('* text=auto eol=lf')) {
  fail('.gitattributes must contain "* text=auto eol=lf"');
}

const expectedHusky = [
  '#!/usr/bin/env sh',
  '. "$(dirname -- "$0")/_/husky.sh"',
  'pnpm -w verify || exit 1',
  'pnpm -w test || exit 1',
  "if pnpm -w run | grep -q '^forbidden-tokens'; then pnpm -w run forbidden-tokens || exit 1; fi",
  ''
].join('\n');
const prePushContent = readFileSync('.husky/pre-push', 'utf8').replace(/\r\n/g, '\n');
if (prePushContent !== expectedHusky) {
  fail('.husky/pre-push must match the enforced template');
}

if (process.env.GITHUB_BASE_REF && process.env.GITHUB_BASE_REF !== 'sandbox') {
  fail(`Pull requests must target sandbox (received ${process.env.GITHUB_BASE_REF})`);
}

const workflowContent = readFileSync('.github/workflows/ci.yml', 'utf8');
if (!workflowContent.includes('corepack prepare pnpm@9.12.0 --activate')) {
  fail('CI workflow must prepare pnpm@9.12.0 via Corepack');
}
if (!workflowContent.includes('pnpm -w install --frozen-lockfile')) {
  fail('CI workflow must install dependencies with --frozen-lockfile');
}

const lockfileContent = readFileSync('pnpm-lock.yaml', 'utf8');
const importerNames = [];
let inImporters = false;
for (const line of lockfileContent.split(/\r?\n/)) {
  if (!inImporters) {
    if (line.trim() === 'importers:') {
      inImporters = true;
    }
    continue;
  }
  if (!line.startsWith('  ')) {
    if (line.trim() === '') {
      continue;
    }
    break;
  }
  if (/^  [^\s]/.test(line)) {
    const name = line.slice(2).split(':')[0].trim();
    if (name) {
      importerNames.push(name);
    }
  }
}

const importerSet = new Set(importerNames);
const allowedImporters = new Set(['.', ...allowList]);
const extraImporters = importerNames.filter((name) => !allowedImporters.has(name));
if (extraImporters.length > 0) {
  fail(`Lockfile contains disallowed importers: ${extraImporters.join(', ')}`);
}
const missingImporters = allowList.filter((name) => !importerSet.has(name));
if (missingImporters.length > 0) {
  const message = `Lockfile importers missing: ${missingImporters.join(', ')}`;
  if (process.env.CI || process.env.GITHUB_ACTIONS) {
    fail(message);
  } else {
    console.warn(`Repo Guard warning: ${message}`);
  }
}

function getChangedFiles() {
  const files = new Set();
  const candidates = [];
  if (process.env.GITHUB_BASE_REF) {
    candidates.push(`origin/${process.env.GITHUB_BASE_REF}`);
    candidates.push(process.env.GITHUB_BASE_REF);
  }
  candidates.push('origin/sandbox');
  candidates.push('sandbox');
  for (const ref of candidates) {
    if (!ref) continue;
    try {
      execSync(`git rev-parse --verify ${ref}`, { stdio: ['ignore', 'pipe', 'pipe'] });
      const mergeBase = execSync(`git merge-base HEAD ${ref}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
      if (mergeBase) {
        const diffOutput = execSync(`git diff --name-only --diff-filter=AMDR ${mergeBase} HEAD`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
        if (diffOutput) {
          diffOutput.split('\n').forEach((entry) => {
            const trimmed = entry.trim();
            if (trimmed) {
              files.add(trimmed);
            }
          });
        }
        if (files.size > 0) {
          break;
        }
      }
    } catch (err) {
      continue;
    }
  }
  if (files.size === 0) {
    try {
      const statusOutput = execSync('git status --porcelain', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
      if (statusOutput) {
        statusOutput.split('\n').forEach((line) => {
          if (!line) {
            return;
          }
          let filePath = '';
          if (line.length > 2 && line[0] !== ' ' && line[1] === ' ') {
            filePath = line.slice(2).trim();
          } else if (line.length > 3) {
            filePath = line.slice(3).trim();
          } else {
            filePath = line.trim();
          }
          if (filePath) {
            files.add(filePath);
          }
        });
      }
    } catch (err) {
      // ignore
    }
  }
  return Array.from(files);
}

const changedFiles = getChangedFiles();
const allowedExact = new Set([
  'pnpm-workspace.yaml',
  'workspace.allowlist.json',
  'pnpm-lock.yaml',
  'package.json',
  '.gitignore',
  '.gitattributes',
  '.husky/pre-push',
  '.github/workflows/ci.yml',
  'scripts/repo-guard.mjs'
]);
const allowedPrefixes = ['packages/spark/', 'packages/til/'];
const violations = [];
for (const filePath of changedFiles) {
  if (allowedExact.has(filePath)) {
    continue;
  }
  if (allowedPrefixes.some((prefix) => filePath.startsWith(prefix))) {
    continue;
  }
  if (filePath.startsWith('.husky/')) {
    if (filePath !== '.husky/pre-push') {
      violations.push(filePath);
    }
    continue;
  }
  if (filePath.startsWith('.github/workflows/')) {
    if (filePath !== '.github/workflows/ci.yml') {
      violations.push(filePath);
    }
    continue;
  }
  violations.push(filePath);
}
if (violations.length > 0) {
  fail(`Changes detected outside the allowed paths: ${violations.join(', ')}`);
}

const disallowedDeletes = [];
if (changedFiles.length > 0) {
  try {
    const statusOutput = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
    if (statusOutput) {
      statusOutput.split('\n').forEach((line) => {
        const status = line.slice(0, 2);
        const filePath = line.slice(3).trim();
        if (filePath && (filePath.startsWith('packages/spark/') || filePath.startsWith('packages/til/'))) {
          if (!status.includes('D')) {
            disallowedDeletes.push(filePath);
          }
        }
      });
    }
  } catch (err) {
    // ignore status errors
  }
}
if (disallowedDeletes.length > 0) {
  fail(`Only deletions are permitted under retired package folders: ${disallowedDeletes.join(', ')}`);
}

console.log('Repo Guard: all checks passed.');
