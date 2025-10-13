#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const errors = [];

const root = process.cwd();

const pnpmLockPath = join(root, 'pnpm-lock.yaml');
const workflowsPath = join(root, '.github', 'workflows');
const gitignorePath = join(root, '.gitignore');
const packageJsonPath = join(root, 'package.json');

const requireString = (filePath, needle, message) => {
  const contents = readFileSync(filePath, 'utf8');
  if (!contents.includes(needle)) {
    errors.push(message);
  }
};

const checkLockfile = () => {
  const contents = readFileSync(pnpmLockPath, 'utf8');
  const matcher = /importers:\s*[\s\S]*?packages\/grasp:/m;
  if (!matcher.test(contents)) {
    errors.push('pnpm-lock.yaml must contain an importer for packages/grasp.');
  }
};

const checkWorkflows = () => {
  const requiredCommand = 'pnpm -w install --frozen-lockfile';
  const workflowFiles = readdirSync(workflowsPath)
    .filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'))
    .map((file) => join(workflowsPath, file))
    .filter((filePath) => statSync(filePath).isFile());
  const ciWorkflows = workflowFiles.filter((filePath) => /ci/i.test(filePath));

  const offenders = ciWorkflows.filter((filePath) => {
    const contents = readFileSync(filePath, 'utf8');
    return !contents.includes(requiredCommand);
  });

  if (ciWorkflows.length === 0) {
    errors.push('At least one CI workflow must be present to enforce frozen-lockfile installs.');
  } else if (offenders.length > 0) {
    errors.push(
      `CI workflows must install with "${requiredCommand}" (missing in: ${offenders
        .map((file) => file.replace(root + '/', ''))
        .join(', ')}).`
    );
  }
};

const checkGitignore = () => {
  requireString(gitignorePath, 'dist/', '.gitignore must ignore dist/.');
  requireString(gitignorePath, '*.zip', '.gitignore must ignore *.zip.');
};

const checkPackageJson = () => {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  const nodeVersion = packageJson.engines?.node;
  const node20Pattern = /^(\^?20(\.|$)|>=?20)/;
  if (typeof nodeVersion !== 'string' || !node20Pattern.test(nodeVersion)) {
    errors.push('Root package.json must enforce Node.js 20.x via engines.node.');
  }

  const mandatoryScripts = ['verify', 'test', 'build'];
  for (const scriptName of mandatoryScripts) {
    if (typeof packageJson.scripts?.[scriptName] !== 'string') {
      errors.push(`Root package.json must define the "${scriptName}" script.`);
    }
  }
};

checkLockfile();
checkWorkflows();
checkGitignore();
checkPackageJson();

if (errors.length > 0) {
  console.error('Repo guard failed:\n - ' + errors.join('\n - '));
  process.exit(1);
}

console.log('Repo guard checks passed.');
