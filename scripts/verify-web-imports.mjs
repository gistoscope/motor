#!/usr/bin/env node
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import ts from 'typescript';

const ROOT = process.cwd();
const TARGET_DIRS = [join(ROOT, 'packages', 'web'), join(ROOT, 'packages', 'web', 'demo')];
const ALLOWED_FILES = new Set([join(ROOT, 'packages', 'web', 'src', 'api.ts')]);
const SKIP_DIR_NAMES = new Set(['node_modules', 'dist', 'build', 'coverage', '.next', '.turbo']);
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts']);

const violations = [];

for (const dir of new Set(TARGET_DIRS)) {
  walk(dir);
}

if (violations.length > 0) {
  console.error('[verify-web-imports] Forbidden imports detected:');
  for (const message of violations) {
    console.error(`  - ${message}`);
  }
  process.exit(1);
}

console.log('[verify-web-imports] OK');

function walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return;
    }
    throw error;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.')) {
      continue;
    }
    if (entry.isDirectory()) {
      if (SKIP_DIR_NAMES.has(entry.name)) {
        continue;
      }
      walk(join(dir, entry.name));
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    const filepath = join(dir, entry.name);
    const ext = extname(entry.name);
    if (!EXTENSIONS.has(ext)) {
      continue;
    }
    if (ALLOWED_FILES.has(filepath)) {
      continue;
    }
    checkFile(filepath);
  }
}

function checkFile(filepath) {
  const content = readFileSync(filepath, 'utf8');
  const source = ts.createSourceFile(
    filepath,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.getScriptKindFromFileName(filepath),
  );
  ts.forEachChild(source, function visit(node) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      if (node.moduleSpecifier.text === '@motor/grasp') {
        const rel = relative(ROOT, filepath);
        violations.push(`${rel}`);
      }
    }
    ts.forEachChild(node, visit);
  });
}
