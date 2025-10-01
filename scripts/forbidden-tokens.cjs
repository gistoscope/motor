// Minimal token policy for MOTOR mono-repo
// Usage: `node scripts/forbidden-tokens.cjs` from repo root
// Exits with code 1 if violations found.

const fs = require('fs');
const path = require('path');

const FORBIDDEN = [
  'simplify(',
];

// Temporary allow-list (posix-style relative paths from repo root)
const TEMP_ALLOW = new Set([
  'packages/cli/src/index.ts',
  'packages/core/src/engine.ts',
  'packages/core/tests/core.unified.test.ts',
  'packages/parser/tests/parser.unified.test.ts',
  'packages/web/src/ui/App.tsx',
]);

function isTextFile(file) {
  const exts = ['.ts', '.tsx', '.js', '.jsx', '.cjs', '.mjs', '.json', '.yml', '.yaml'];
  return exts.includes(path.extname(file).toLowerCase());
}

function walk(dir, files=[]) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules','dist','.git'].includes(entry.name)) continue;
      walk(p, files);
    } else {
      files.push(p);
    }
  }
  return files;
}

function main() {
  const root = process.cwd();
  const pkgDir = path.join(root, 'packages');
  if (!fs.existsSync(pkgDir)) {
    console.error("[forbidden-tokens] 'packages/' not found. Run from repo root.");
    process.exit(1);
  }
  const files = walk(pkgDir);
  const violations = [];
  for (const abs of files) {
    const rel = path.relative(root, abs).replace(/\\/g, '/');
    if (!isTextFile(abs)) continue;
    if (TEMP_ALLOW.has(rel)) continue;
    const content = fs.readFileSync(abs, 'utf8');
    for (const token of FORBIDDEN) {
      if (content.includes(token)) {
        violations.push(`${rel} :: contains "${token}"`);
      }
    }
  }
  if (violations.length) {
    console.error('[forbidden-tokens] Violations:');
    for (const v of violations) console.error(' - ' + v);
    process.exit(1);
  } else {
    console.log('[forbidden-tokens] OK');
  }
}

if (require.main === module) {
  main();
}
