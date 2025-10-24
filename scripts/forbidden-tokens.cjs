// scripts/forbidden-tokens.cjs
// Purpose: fail fast if запрещённые токены встречаются в исходниках.
// ВАЖНО: проверяем только TypeScript-файлы (.ts/.tsx/.mts/.cts), чтобы не ловить ложные срабатывания в .js.

const fs = require("node:fs");
const path = require("node:path");

const ROOT = process.cwd();

// что считаем исходниками
const ALLOWED_EXTS = new Set([".ts", ".tsx", ".mts", ".cts"]);

// директории, которые не сканируем
const IGNORE_DIRS = new Set([
  "node_modules",
  "dist",
  "coverage",
  ".git",
  ".husky",
  ".diag",
  ".tmp",
  "tmp",
  "docs",
  "docs-free",
  "reports",
  "packages/web", // веб-пакет не влияет на stage-1 ядро
  "tests"         // независимые e2e/fixtures не блокируют пуш
]);

// файлы/паттерны, которые пропускаем (отдельный whitelist при необходимости)
const IGNORE_FILE_PATTERNS = [
  /\.d\.ts$/i,
  /\.test\.(ts|tsx|mts|cts)$/i,
  /\.spec\.(ts|tsx|mts|cts)$/i,
  /__tests__[/\\]/i,
  /fixtures?[/\\]/i,
];

// запреты (строгие)
const CHECKS = [
  { re: /\bmath\.simplify\(/i, label: 'math.simplify(' },
  { re: /\bsimplify\(/,       label: 'simplify(' }, // не совпадает с "simplifyExact("
];

// ---- helpers
function shouldIgnoreDir(dir) {
  const name = path.basename(dir);
  return IGNORE_DIRS.has(name);
}

function shouldIgnoreFile(rel) {
  return IGNORE_FILE_PATTERNS.some((re) => re.test(rel));
}

function walk(dir, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
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

function main() {
  const files = [];
  walk(ROOT, files);
  const violations = [];

  for (const abs of files) {
    let content = "";
    try {
      content = fs.readFileSync(abs, "utf8");
    } catch { /* ignore unreadable */ }

    for (const chk of CHECKS) {
      // пропустим "simplifyExact(" и "simplifySafe("
      if (chk.label === "simplify(") {
        if (/\bsimplifyExact\(/.test(content) || /\bsimplifySafe\(/.test(content)) continue;
      }
      if (chk.re.test(content)) {
        violations.push(`${path.relative(ROOT, abs)} :: contains "${chk.label}"`);
      }
    }
  }

  if (violations.length) {
    console.error("[forbidden-tokens] Violations:");
    for (const v of violations) console.error(" - " + v);
    process.exit(1);
  } else {
    console.log("[forbidden-tokens] OK");
  }
}

main();
