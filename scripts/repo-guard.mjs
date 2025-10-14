#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const errors = [];

function ensure(condition, message) {
  if (!condition) {
    errors.push(message);
  }
}

const verifyScript = join(ROOT, 'scripts', 'verify-no-web.mjs');
ensure(existsSync(verifyScript), 'Expected scripts/verify-no-web.mjs to exist');

const pkgPath = join(ROOT, 'package.json');
try {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  ensure(pkg?.scripts?.verify === 'node scripts/verify-no-web.mjs',
    'package.json scripts.verify must be "node scripts/verify-no-web.mjs"');
} catch (error) {
  errors.push(`Unable to read package.json: ${error instanceof Error ? error.message : String(error)}`);
}

const tsconfigBase = join(ROOT, 'tsconfig.base.json');
ensure(existsSync(tsconfigBase), 'tsconfig.base.json must exist at the repo root');

const workspacePath = join(ROOT, 'pnpm-workspace.yaml');
if (existsSync(workspacePath)) {
  const workspace = readFileSync(workspacePath, 'utf8');
  ensure(!workspace.includes('*'), 'pnpm-workspace.yaml must not contain glob patterns');
} else {
  errors.push('pnpm-workspace.yaml is required');
}

if (errors.length > 0) {
  for (const message of errors) {
    console.error(`[repo-guard] ${message}`);
  }
  process.exit(1);
}

console.log('[repo-guard] OK');
