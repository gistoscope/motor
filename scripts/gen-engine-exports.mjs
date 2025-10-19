import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import ts from 'typescript';

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const packages = [
  { name: '@motor/core', dir: 'packages/core' },
  { name: '@motor/parser', dir: 'packages/parser' },
];

function hasModifier(node, kind) {
  return Array.isArray(node.modifiers) && node.modifiers.some((modifier) => modifier.kind === kind);
}

function collectTypeCandidates(source) {
  const names = new Set();

  function visit(node) {
    if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
      const isTypeOnlyExport = Boolean(node.isTypeOnly);
      for (const specifier of node.exportClause.elements) {
        if (isTypeOnlyExport || specifier.isTypeOnly) {
          names.add(specifier.name.text);
        }
      }
    } else if (ts.isTypeAliasDeclaration(node) && hasModifier(node, ts.SyntaxKind.ExportKeyword)) {
      names.add(node.name.text);
    } else if (ts.isInterfaceDeclaration(node) && hasModifier(node, ts.SyntaxKind.ExportKeyword)) {
      names.add(node.name.text);
    }

    node.forEachChild(visit);
  }

  visit(source);
  return names;
}

async function getGitSha() {
  const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot });
  return stdout.trim();
}

async function getRuntimeExports(entryPath) {
  try {
    const mod = await import(pathToFileURL(entryPath).href);
    const names = new Set(Object.getOwnPropertyNames(mod));
    names.delete('__esModule');
    return names;
  } catch (error) {
    throw new Error(`Failed to import ${entryPath}. Did you run \`pnpm -r build\`?\n${error.message}`);
  }
}

function toList(items) {
  if (items.length === 0) {
    return '_None_';
  }
  return items.map((name) => `- \`${name}\``).join('\n');
}

async function main() {
  const packageSummaries = [];

  for (const pkg of packages) {
    const pkgDir = path.join(repoRoot, pkg.dir);
    const pkgJsonPath = path.join(pkgDir, 'package.json');
    const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, 'utf8'));
    const entryPath = path.join(pkgDir, pkgJson.main || 'dist/index.js');
    const typesPath = path.join(pkgDir, pkgJson.types || 'dist/index.d.ts');

    const runtimeExports = await getRuntimeExports(entryPath);

    const typeSourceText = await fs.readFile(typesPath, 'utf8');
    const source = ts.createSourceFile(typesPath, typeSourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const typeCandidates = collectTypeCandidates(source);

    const typeOnlyExports = [...typeCandidates].filter((name) => !runtimeExports.has(name)).sort();
    const runtimeExportList = [...runtimeExports].sort();

    packageSummaries.push({
      title: pkg.name === '@motor/core' ? 'Core API exports' : 'Parser API exports',
      runtimeExports: runtimeExportList,
      typeOnlyExports,
    });
  }

  const sha = await getGitSha();

  const sections = packageSummaries.map((summary) => {
    const runtimeSection = `### JavaScript exports\n${toList(summary.runtimeExports)}`;
    const typeSection = `### Type-only exports\n${toList(summary.typeOnlyExports)}`;
    return `## ${summary.title}\n\n${runtimeSection}\n\n${typeSection}`;
  });

  const doc = `# Engine API snapshot\n\nGenerated from commit \`${sha}\`.\n\n${sections.join('\n\n')}\n`;

  const docPath = path.join(repoRoot, 'docs', 'ENGINE-API-SNAPSHOT.md');
  await fs.writeFile(docPath, doc, 'utf8');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
