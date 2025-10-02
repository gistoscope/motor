#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const problems = [];

if (!process.env.VITE_EXPERIMENTAL_M0) {
  problems.push('VITE_EXPERIMENTAL_M0 is not set. Dev routes like /dev/step will be gated.');
}

const repoRoot = process.cwd();
const expectPaths = [
  'packages/core/src/index.ts',
  'packages/parser/src/index.ts',
  'packages/tsa/src/index.ts',
  'packages/web/vite.config.ts',
  'packages/web/vitest.config.ts',
];

for (const p of expectPaths) {
  if (!fs.existsSync(path.join(repoRoot, p))) {
    problems.push(`Missing file: ${p}`);
  }
}

if (problems.length) {
  console.error('Preflight checks found issues:\n- ' + problems.join('\n- '));
  process.exit(2);
} else {
  console.log('Preflight OK: env + expected files look good.');
}
