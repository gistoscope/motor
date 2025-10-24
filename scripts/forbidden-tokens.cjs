// scripts/forbidden-tokens.cjs
// Goal: запретить "умные" упрощающие операции из mathjs, не трогая легитимные упоминания.
// Сканируем только TS-исходники и игнорируем строки/комментарии, чтобы CLI help не ловился.

const fs = require("node:fs");
const path = require("node:path");

const ROOT = process.cwd();
const ALLOWED_EXTS = new Set([".ts", ".tsx", ".mts", ".cts"]);

const IGNORE_DIRS = new Set([
  "node_modules", "dist", "coverage", ".git", ".husky",
  ".diag", ".tmp", "tmp", "reports", "docs", "docs-free",
]);

const IGNORE_FILE_PATTERNS = [
  /\.d\.ts$/i,
  /\.test\.(ts|tsx|mts|cts)$/i,
  /\.spec\.(ts|tsx|mts|cts)$/i,
  /__tests__[/\\]/i,
  /fixtures?[/\\]/i,
];

// ЦЕЛЕВЫЕ ЗАПРЕТЫ:
//
// 1) импорт simplify из mathjs (любые формы)
// 2) вызов math.simplify( ... )
// 3) вызов simplify( ... ), НО только если явно импортирован simplify из 'mathjs'
//    (поймаем по импорту в том же файле)
const RE_IMPORT_MATHJS_SIMPLIFY_NAMED =
  /\bimport\s+\{[^}]*\bsimplify\b[^}]*\}\s+from\s+['"]mathjs['"]/i;
const RE_IMPORT_MATHJS_SIMPLIFY_DEFAULT =
  /\bimport\s+simplify\s+from\s+['"]mathjs['"]/i;
const RE_FROM_MATHJS = /\bfrom\s+['"]mathjs['"]/i;

const RE_MATH_SIMPLIFY_CALL = /\bmath\s*\.\s*simplify\s*\(/i;
// Строгий глобальный запрет на "simplify(" не используем, чтобы не ломать легальный код.
// const RE_BARE_SIMPLIFY_CALL = /\bsimplify\s*\(/;

function stripCommentsAndStrings(src) {
  // удаляем /* ... */:
  src = src.replace(/\/\*[\s\S]*?\*\//g, "");
  // удаляем // ... до конца строки:
  src = src.replace(/\/\/.*$/gm, "");
  // удаляем строки '...' / "..." / `...` (приближенно):
  src = src.replace(/(['"`])(?:\\.|(?!\1)[\s\S])*?\1/g, "");
  return src;
}

function shouldIgnoreDir(p) {
  return IGNORE_DIRS.has(path.basename(p));
}
function shouldIgnoreFile(rel) {
  return IGNORE_FILE_PATTERNS.some((re) => re.test(rel));
}

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    const rel = path.relative(ROOT, p);
    if (e.isDirectory()) {
      if (!shouldIgnoreDir(p)) walk(p, out);
      continue;
    }
    const ext = path.extname(e.name).toLowerCase();
    if (!ALLOWED_EXTS.has(ext)) continue;
    if (shouldIgnoreFile(rel)) continue;
    out.push(p);
  }
}

function scanFile(abs) {
  const rel = path.relative(ROOT, abs);
  let raw = "";
  try { raw = fs.readFileSync(abs, "utf8"); } catch { return []; }

  // Быстрая проверка: если файл вообще не касается mathjs — пропускаем.
  if (!RE_FROM_MATHJS.test(raw) && !RE_MATH_SIMPLIFY_CALL.test(raw)) {
    return [];
  }

  const sanitized = stripCommentsAndStrings(raw);
  const violations = [];

  // 1) Импорты из mathjs со simplify
  if (RE_IMPORT_MATHJS_SIMPLIFY_NAMED.test(sanitized)) {
    violations.push(`${rel} :: imports { simplify } from 'mathjs'`);
  }
  if (RE_IMPORT_MATHJS_SIMPLIFY_DEFAULT.test(sanitized)) {
    violations.push(`${rel} :: imports default simplify from 'mathjs'`);
  }

  // 2) math.simplify( ... )
  if (RE_MATH_SIMPLIFY_CALL.test(sanitized)) {
    violations.push(`${rel} :: contains "math.simplify("`);
  }

  // 3) bare simplify( ... ) — ловим только если импортирован из mathjs
  if (
    (RE_IMPORT_MATHJS_SIMPLIFY_NAMED.test(sanitized) ||
     RE_IMPORT_MATHJS_SIMPLIFY_DEFAULT.test(sanitized)) &&
    /\bsimplify\s*\(/.test(sanitized)
  ) {
    violations.push(`${rel} :: calls "simplify(" imported from 'mathjs'`);
  }

  return violations;
}

function main() {
  const files = [];
  walk(ROOT, files);
  const violations = [];
  for (const f of files) {
    violations.push(...scanFile(f));
  }

  if (violations.length) {
    console.error("[forbidden-tokens] Violations:");
    for (const v of violations) console.error(" - " + v);
    process.exit(1);
  }
  console.log("[forbidden-tokens] OK");
}

main();
