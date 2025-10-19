#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();

function step(title, cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (r.status !== 0) {
    console.error(`[verify-no-web] Step failed: ${title}`);
    process.exit(r.status || 1);
  }
}

// 0) Generate TS path aliases if script exists
const genAliases = join(ROOT, 'scripts', 'generate-aliases.mjs');
if (existsSync(genAliases)) {
  step('generate-aliases', 'node', [genAliases]);
  step('generate-aliases --check', 'node', [genAliases, '--check']);
} else {
  console.warn('[verify-no-web] scripts/generate-aliases.mjs not found — continuing');
}

// 0.5) Ensure browser-facing modules do not import @motor/grasp directly
const verifyWebImports = join(ROOT, 'scripts', 'verify-web-imports.mjs');
if (existsSync(verifyWebImports)) {
  step('verify-web-imports', 'node', [verifyWebImports]);
} else {
  console.warn('[verify-no-web] scripts/verify-web-imports.mjs not found — continuing');
}

// 1) Build a temporary root tsconfig that excludes web (and spark)
const tmpDir = join(ROOT, '.tmp');
try { mkdirSync(tmpDir, { recursive: true }); } catch {}
const tmpCfg = join(tmpDir, 'tsconfig.verify-no-web.json');

// Ensure base config exists
const baseCfg = join(ROOT, 'tsconfig.base.json');
if (!existsSync(baseCfg)) {
  console.error('[verify-no-web] Missing tsconfig.base.json at repo root');
  process.exit(1);
}

const include = ['../packages/**/*', '../scripts/**/*', '../*.ts', '../*.mts', '../*.tsx'];
const exclude = ['../packages/web/**', '../packages/spark/**', '../node_modules/**'];

const hasNodeTypes = existsSync(join(ROOT, 'node_modules', '@types', 'node', 'package.json'));
const hasVitest = existsSync(join(ROOT, 'node_modules', 'vitest', 'package.json'));

const stubLines = [];
if (!hasNodeTypes) {
  stubLines.push(
    "declare module 'node:fs' {\n  export function existsSync(...args: any[]): boolean;\n  export function mkdirSync(...args: any[]): any;\n  export function readFileSync(...args: any[]): any;\n  export function writeFileSync(...args: any[]): any;\n  const fs: any;\n  export default fs;\n}",
    "declare module 'node:path' {\n  export function join(...args: any[]): string;\n  export function resolve(...args: any[]): string;\n  const path: any;\n  export default path;\n}",
    "declare module 'path' {\n  export function join(...args: any[]): string;\n  export function resolve(...args: any[]): string;\n  const path: any;\n  export default path;\n}",
    "declare module 'node:url' {\n  export function fileURLToPath(...args: any[]): any;\n}",
    "declare module 'node:process' {\n  const proc: any;\n  export default proc;\n}",
    "declare module 'node:child_process' {\n  export function spawnSync(...args: any[]): any;\n}",
    "declare const process: {\n  argv: string[];\n  exit: (...args: any[]) => never;\n  [key: string]: any;\n};",
    'declare const __dirname: string;'
  );
}
if (!hasVitest) {
  stubLines.push(
    "declare module 'vitest' {\n  export const describe: any;\n  export const it: any;\n  export const expect: any;\n  export const beforeAll: any;\n  export const afterAll: any;\n  export const beforeEach: any;\n  export const afterEach: any;\n  export const vi: any;\n}",
    "declare module 'vitest/config' {\n  export const defineConfig: any;\n}"
  );
}

if (stubLines.length > 0) {
  const stubPath = join(tmpDir, 'verify-no-web-stubs.d.ts');
  writeFileSync(stubPath, stubLines.join('\n'));
  include.push('./verify-no-web-stubs.d.ts');
}

const types = [];
if (hasNodeTypes) types.push('node');
if (hasVitest) types.push('vitest');

const cfg = {
  extends: '../tsconfig.base.json',
  include,
  exclude,
  ...(types.length > 0 ? { compilerOptions: { types } } : {}),
};
writeFileSync(tmpCfg, JSON.stringify(cfg, null, 2));

// 2) Run TypeScript once at the root with the temp config
// Using workspace-wide pnpm so it picks root Typescript
step('tsc --noEmit (root, no web)', 'pnpm', ['-w', 'exec', 'tsc', '-p', tmpCfg, '--noEmit']);

console.log('[verify-no-web] OK');
