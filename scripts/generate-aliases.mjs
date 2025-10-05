#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const aliasRootDir = path.resolve(scriptDir, '..');
const tsconfigPath = path.join(aliasRootDir, 'tsconfig.base.json');
const outFile = path.join(aliasRootDir, 'scripts/aliases.generated.ts');
const isCheck = process.argv.includes('--check');

function readJSON(p){ return JSON.parse(fs.readFileSync(p, 'utf8')); }
const paths = readJSON(tsconfigPath)?.compilerOptions?.paths ?? {};

// Нормализуем цель: "src/engine/*" или "src/engine/index.ts" -> "src/engine"
function normalizeTarget(t) {
  let v = String(t);
  v = v.replace(/\/\*$/,'');                         // убираем /* в конце
  v = v.replace(/\/index\.(ts|tsx|js|jsx)$/,'');     // убираем /index.*
  return v.replace(/\/$/,'');                        // убираем конечный /
}

// Группируем по базовому алиасу, напр. "@motor/engine" (без /*)
const byBase = new Map();
for (const key of Object.keys(paths).sort()) {
  const base = key.replace(/\/\*$/,'');
  const list = Array.isArray(paths[key]) ? paths[key] : [];
  if (!list.length) continue;
  const candidate = normalizeTarget(list[0]);
  const arr = byBase.get(base) ?? [];
  arr.push(candidate);
  byBase.set(base, arr);
}

// Выбираем лучшую директорию для каждого базового алиаса (предпочитаем папку)
const entries = Array.from(byBase.entries()).map(([find, candidates]) => {
  const chosen =
    candidates.find(c => !/\.(ts|tsx|js|jsx)$/.test(c))    // папка
    ?? normalizeTarget(candidates[0]);                      // запасной вариант
  return { find, repl: `path.resolve(aliasRootDir, ${JSON.stringify(chosen)})` };
});

const content = `// AUTO-GENERATED. DO NOT EDIT.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const aliasRootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const viteAliases = [
${entries.map(e => `  { find: ${JSON.stringify(e.find)}, replacement: ${e.repl} }`).join(',\n')}
] as const;

export const vitestAliases = Object.fromEntries(viteAliases.map(e => [e.find, e.replacement])) as const;
`;

if (isCheck) {
  if (!fs.existsSync(outFile)) { console.error('aliases.generated.ts is missing.'); process.exit(1); }
  const cur = fs.readFileSync(outFile, 'utf8');
  if (cur !== content) { console.error('aliases.generated.ts out of date.'); process.exit(1); }
  process.exit(0);
}

fs.writeFileSync(outFile, content);
console.log('Wrote ' + path.relative(aliasRootDir, outFile));
