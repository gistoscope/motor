// MOTOR token policy (tightened, retry 'b')
// - Forbids specific tokens in production source files
// - Skips test files and test directories
// Usage: run from repo root -> `node scripts/forbidden-tokens.cjs`

const fs = require('fs');
const path = require('path');

const FORBIDDEN = ['simplify('];

// Temporary allow-list ONLY for production files (tests are excluded by default)
const TEMP_ALLOW = new Set([
  'packages/cli/src/index.ts',
  'packages/core/src/engine.ts',
  'packages/web/src/ui/App.tsx',
]);

function isCandidateFile(rel) {
  rel = rel.replace(/\\/g, '/');
  // exclude tests and obvious non-prod
  if (/(^|\/)tests?\//.test(rel)) return false;
  if (/\.(test|spec)\.[tj]sx?$/.test(rel)) return false;
  if (/\/__tests__\//.test(rel)) return false;
  if (/^\.git\//.test(rel)) return false;
  if (/\/(node_modules|dist)\//.test(rel)) return false;
  const exts = new Set(['.ts', '.tsx', '.js', '.jsx', '.cjs', '.mjs']);
  return exts.has(path.extname(rel).toLowerCase());
}

function walk(dir, out=[]) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'dist'].includes(entry.name)) continue;
      walk(p, out);
    } else {
      out.push(p);
    }
  }
  return out;
}

function main() {
  const root = process.cwd();
  const pkgDir = path.join(root, 'packages');
  if (!fs.existsSync(pkgDir)) {
    console.error("[forbidden-tokens] 'packages/' not found. Run from repo root.");
    process.exit(1);
  }
  const all = walk(pkgDir);
  const violations = [];
  for (const abs of all) {
    const rel = path.relative(root, abs).replace(/\\/g, '/');
    if (!isCandidateFile(rel)) continue;
    if (TEMP_ALLOW.has(rel)) continue;
    const text = fs.readFileSync(abs, 'utf8');
    for (const token of FORBIDDEN) {
      if (text.includes(token)) {
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

if (require.main === module) main();
